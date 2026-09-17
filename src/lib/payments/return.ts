import { type ReturnResolution, type ReturnStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  createReturnRequest,
  updateReturnStatus,
  updateReturnRefund,
  updateReturnToCompleted,
  type PublicReturnRequest,
} from "@/lib/db/returns";
import { getRefundByOrderId, createRefundRecord, markRefundProcessing, markRefundSuccess, markRefundFailed, generateIdempotencyKey } from "@/lib/db/refunds";
import { refundPayment, fetchPaymentAmount } from "@/lib/payments/razorpay";
import {
  createReturnRequestedNotification,
  createReturnApprovedNotification,
  createReturnRejectedNotification,
} from "@/lib/db/notifications";
import { newId } from "@/lib/db/store";

export type ReturnReason = "DEFECTIVE" | "WRONG_ITEM" | "SIZE_ISSUE" | "NOT_AS_DESCRIBED" | "CHANGED_MY_MIND" | "OTHER";

export const RETURN_REASONS: ReturnReason[] = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "SIZE_ISSUE",
  "NOT_AS_DESCRIBED",
  "CHANGED_MY_MIND",
  "OTHER",
] as const;

export const RETURNABLE_STATUSES = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;

export async function requestReturn(userId: string, orderId: string, input: {
  resolution: ReturnResolution;
  reason: string;
  note?: string;
  exchangeVariantSku?: string | null;
  items: { sku: string; qty: number; condition?: string | null; reason?: string | null }[];
}): Promise<{ ok: true; returnRequest: PublicReturnRequest } | { ok: false; error: string; status: number }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      paymentStatus: true,
      orderStatus: true,
      items: { select: { sku: true, qty: true } },
    },
  });

  if (!order || order.userId !== userId) {
    return { ok: false, error: "Order not found.", status: 404 };
  }

  if (order.paymentStatus !== "PAID") {
    return { ok: false, error: "Only paid orders can request a return.", status: 400 };
  }

  if (!RETURNABLE_STATUSES.includes(order.orderStatus as (typeof RETURNABLE_STATUSES)[number])) {
    return { ok: false, error: "This order is not eligible for returns.", status: 400 };
  }

  const existingReturn = await prisma.returnRequest.findFirst({
    where: { orderId, status: { in: ["REQUESTED", "APPROVED"] } },
    select: { id: true },
  });
  if (existingReturn) {
    return { ok: false, error: "A return request is already pending or approved for this order.", status: 400 };
  }

  if (input.items.length === 0) {
    return { ok: false, error: "Please select at least one item to return.", status: 400 };
  }

  for (const item of input.items) {
    if (item.qty <= 0) {
      return { ok: false, error: "Quantity must be greater than 0.", status: 400 };
    }
    const orderItem = order.items.find((oi) => oi.sku === item.sku);
    if (!orderItem) {
      return { ok: false, error: `Item with SKU ${item.sku} does not belong to this order.`, status: 400 };
    }
    if (item.qty > orderItem.qty) {
      return { ok: false, error: `Cannot return more than ${orderItem.qty} of ${item.sku}.`, status: 400 };
    }
  }

  if (input.resolution === "EXCHANGE" || input.resolution === "REPLACE") {
    if (!input.exchangeVariantSku) {
      return { ok: false, error: "An exchange variant SKU is required for exchange/replace.", status: 400 };
    }
    const variantExists = await prisma.product.findUnique({
      where: { sku: input.exchangeVariantSku },
      select: { sku: true, b2cAvailable: true, stock: true },
    });
    if (!variantExists || !variantExists.b2cAvailable) {
      return { ok: false, error: "Selected exchange variant is not available.", status: 400 };
    }
  }

  if (input.resolution === "EXCHANGE" && input.exchangeVariantSku) {
    const variant = await prisma.product.findUnique({
      where: { sku: input.exchangeVariantSku },
      select: { stock: true },
    });
    if (variant && variant.stock !== null && variant.stock <= 0) {
      return { ok: false, error: "Selected exchange variant is out of stock.", status: 400 };
    }
  }

  try {
    const created = await createReturnRequest({
      orderId,
      userId,
      resolution: input.resolution,
      reason: input.reason,
      note: input.note,
      exchangeVariantSku: input.exchangeVariantSku || null,
      items: input.items.map((i) => ({
        sku: i.sku,
        qty: i.qty,
        condition: i.condition || null,
        reason: i.reason || null,
      })),
    });

    void createReturnRequestedNotification(orderId).catch(() => undefined);

    return { ok: true, returnRequest: created as unknown as PublicReturnRequest };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again.", status: 500 };
  }
}

export async function approveReturnRequest(
  returnId: string,
  input?: { adminNote?: string },
): Promise<{ ok: true; returnRequest: PublicReturnRequest } | { ok: false; error: string; status: number }> {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      items: true,
      order: {
        select: {
          id: true,
          userId: true,
          totalLabel: true,
          paymentStatus: true,
          orderStatus: true,
          razorpayPaymentId: true,
        },
      },
    },
  });

  if (!returnRequest) {
    return { ok: false, error: "Return request not found.", status: 404 };
  }

  if (returnRequest.status !== "REQUESTED") {
    return { ok: false, error: "Only pending return requests can be approved.", status: 400 };
  }

  if (returnRequest.order.paymentStatus !== "PAID") {
    return { ok: false, error: "Order is not paid. Cannot process refund.", status: 400 };
  }

  try {
    const updated = await updateReturnStatus(returnId, "APPROVED", input?.adminNote);
    if (!updated) {
      return { ok: false, error: "Failed to update return status.", status: 500 };
    }

    void createReturnApprovedNotification(returnRequest.order.id).catch(() => undefined);

    return { ok: true, returnRequest: updated as unknown as PublicReturnRequest };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again.", status: 500 };
  }
}

export async function processApprovedReturn(returnId: string): Promise<{ ok: true; returnRequest: PublicReturnRequest } | { ok: false; error: string; status: number }> {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      items: true,
      order: {
        select: {
          id: true,
          userId: true,
          totalLabel: true,
          paymentStatus: true,
          orderStatus: true,
          razorpayPaymentId: true,
        },
      },
    },
  });

  if (!returnRequest) {
    return { ok: false, error: "Return request not found.", status: 404 };
  }

  if (returnRequest.status !== "APPROVED") {
    return { ok: false, error: "Only approved return requests can be processed.", status: 400 };
  }

  if (returnRequest.resolution === "REFUND") {
    return processRefundReturn(returnRequest);
  }

  if (returnRequest.resolution === "REPLACE" || returnRequest.resolution === "EXCHANGE") {
    return processExchangeReturn(returnRequest);
  }

  return { ok: false, error: "Invalid resolution type.", status: 400 };
}

async function processRefundReturn(returnRequest: {
  id: string;
  orderId: string;
  order: { id: string; razorpayPaymentId: string | null };
  items: { sku: string; qty: number }[];
}): Promise<{ ok: true; returnRequest: PublicReturnRequest } | { ok: false; error: string; status: number }> {
  const existingRefund = await getRefundByOrderId(returnRequest.orderId);

  if (existingRefund && (existingRefund.status === "SUCCESS" || existingRefund.status === "PROCESSING")) {
    await updateReturnRefund(returnRequest.id, existingRefund.id, existingRefund.amount);
    await updateReturnToCompleted(returnRequest.id);
    return { ok: true, returnRequest: (await prisma.returnRequest.findUnique({
      where: { id: returnRequest.id },
      include: {
        items: { select: { sku: true, qty: true, condition: true, reason: true } },
        order: { select: { id: true, userId: true, totalLabel: true, paymentStatus: true, orderStatus: true, razorpayPaymentId: true } },
        refund: { select: { id: true, status: true, amount: true, razorpayRefundId: true, failureReason: true } },
      },
    })) as unknown as PublicReturnRequest };
  }

  const razorpayPaymentId = returnRequest.order.razorpayPaymentId;
  if (!razorpayPaymentId) {
    return { ok: false, error: "No payment ID found for this order.", status: 400 };
  }

  const paymentInfo = await fetchPaymentAmount({ razorpayPaymentId });
  if (!paymentInfo || !paymentInfo.captured || paymentInfo.amount <= 0) {
    return { ok: false, error: "Could not determine refund amount from Razorpay.", status: 502 };
  }

  const refundAmount = paymentInfo.amount;

  let refund;
  const idempotencyKey = generateIdempotencyKey(returnRequest.orderId);

  try {
    refund = await createRefundRecord({
      orderId: returnRequest.orderId,
      razorpayPaymentId,
      idempotencyKey,
      amount: refundAmount,
      currency: "INR",
    });
  } catch {
    const existing = await getRefundByOrderId(returnRequest.orderId);
    if (existing) {
      refund = existing;
    } else {
      return { ok: false, error: "Could not create refund record.", status: 500 };
    }
  }

  await markRefundProcessing(refund.id).catch(() => undefined);

  await updateReturnRefund(returnRequest.id, refund.id, refundAmount);

  let refundResult;
  try {
    refundResult = await refundPayment({
      razorpayPaymentId,
      amountPaise: refundAmount,
      idempotencyKey,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    await markRefundFailed(refund.id, reason).catch(() => undefined);
    void createReturnRejectedNotification(returnRequest.orderId).catch(() => undefined);
    return { ok: false, error: `Refund failed: ${reason}`, status: 502 };
  }

  if (refundResult.status === "processed") {
    await markRefundSuccess(refund.id, refundResult.id);
    await updateReturnToCompleted(returnRequest.id);
  } else if (refundResult.status === "pending") {
    await updateReturnToCompleted(returnRequest.id);
  } else {
    await markRefundFailed(refund.id, `Razorpay refund status: ${refundResult.status}`).catch(() => undefined);
    await updateReturnStatus(returnRequest.id, "APPROVED");
    return { ok: false, error: `Refund failed with status: ${refundResult.status}`, status: 502 };
  }

  const full = await prisma.returnRequest.findUnique({
    where: { id: returnRequest.id },
    include: {
      items: { select: { sku: true, qty: true, condition: true, reason: true } },
      order: { select: { id: true, userId: true, totalLabel: true, paymentStatus: true, orderStatus: true, razorpayPaymentId: true } },
      refund: { select: { id: true, status: true, amount: true, razorpayRefundId: true, failureReason: true } },
    },
  });

  return { ok: true, returnRequest: full as unknown as PublicReturnRequest };
}

async function processExchangeReturn(returnRequest: {
  id: string;
  orderId: string;
  order: { id: string; userId: string; totalLabel: string; paymentStatus: string; orderStatus: string; razorpayPaymentId: string | null };
  items: { sku: string; qty: number }[];
  exchangeVariantSku: string | null;
}): Promise<{ ok: true; returnRequest: PublicReturnRequest } | { ok: false; error: string; status: number }> {
  if (!returnRequest.exchangeVariantSku) {
    return { ok: false, error: "No exchange variant specified.", status: 400 };
  }

  const result = await checkExchangeEligibility(returnRequest);
  if (!result.ok) {
    return result;
  }

  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.update({
      where: { id: returnRequest.id },
      data: { status: "COMPLETED", processedAt: new Date() },
    });

    const exchangeVariant = result.variant!;

    if (exchangeVariant.stock !== null && exchangeVariant.stock > 0) {
      await tx.product.update({
        where: { sku: exchangeVariant.sku },
        data: { stock: { decrement: 1 } },
      });
    }
  });

  const full = await prisma.returnRequest.findUnique({
    where: { id: returnRequest.id },
    include: {
      items: { select: { sku: true, qty: true, condition: true, reason: true } },
      order: { select: { id: true, userId: true, totalLabel: true, paymentStatus: true, orderStatus: true, razorpayPaymentId: true } },
      refund: { select: { id: true, status: true, amount: true, razorpayRefundId: true, failureReason: true } },
    },
  });

  return { ok: true, returnRequest: full as unknown as PublicReturnRequest };
}

export async function rejectReturnRequest(
  returnId: string,
  input: { adminNote: string },
): Promise<{ ok: true; returnRequest: PublicReturnRequest } | { ok: false; error: string; status: number }> {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, orderId: true },
  });

  if (!returnRequest) {
    return { ok: false, error: "Return request not found.", status: 404 };
  }

  if (returnRequest.status !== "REQUESTED") {
    return { ok: false, error: "Only pending return requests can be rejected.", status: 400 };
  }

  try {
    const updated = await updateReturnStatus(returnId, "REJECTED", input.adminNote);
    if (!updated) {
      return { ok: false, error: "Failed to update return status.", status: 500 };
    }

    void createReturnRejectedNotification(returnRequest.orderId).catch(() => undefined);

    return { ok: true, returnRequest: updated as unknown as PublicReturnRequest };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again.", status: 500 };
  }
}

export async function cancelReturnRequest(userId: string, returnId: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, userId: true, status: true, orderId: true },
  });

  if (!returnRequest || returnRequest.userId !== userId) {
    return { ok: false, error: "Return request not found.", status: 404 };
  }

  if (!["REQUESTED", "APPROVED"].includes(returnRequest.status)) {
    return { ok: false, error: "This return request cannot be cancelled.", status: 400 };
  }

  await prisma.returnRequest.update({
    where: { id: returnId },
    data: { status: "CANCELLED" },
  });

  return { ok: true };
}

async function checkExchangeEligibility(returnRequest: {
  items: { sku: string; qty: number }[];
  exchangeVariantSku: string | null;
}): Promise<{ ok: true; variant: { sku: string; stock: number | null; b2cAvailable: boolean } | null } | { ok: false; error: string; status: number }> {
  if (!returnRequest.exchangeVariantSku) {
    return { ok: false, error: "No exchange variant specified.", status: 400 };
  }

  const variant = await prisma.product.findUnique({
    where: { sku: returnRequest.exchangeVariantSku },
    select: { sku: true, stock: true, b2cAvailable: true },
  });

  if (!variant) {
    return { ok: false, error: "Exchange variant not found.", status: 400 };
  }

  if (!variant.b2cAvailable) {
    return { ok: false, error: "Exchange variant is not available for exchange.", status: 400 };
  }

  if (variant.stock !== null && variant.stock <= 0) {
    return { ok: false, error: "Exchange variant is out of stock.", status: 400 };
  }

  return { ok: true, variant };
}

export function isReturnStatus(value: string): value is ReturnStatus {
  return ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(value);
}

export function isReturnResolution(value: string): value is ReturnResolution {
  return ["REFUND", "REPLACE", "EXCHANGE"].includes(value);
}