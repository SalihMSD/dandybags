import type { RefundStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getRefundByOrderId,
  tryCreateRefundRecord,
  markRefundProcessing,
  markRefundSuccess,
  markRefundFailed,
  updateRefundRazorpayId,
  generateIdempotencyKey,
  type RefundRecord,
} from "@/lib/db/refunds";
import {
  refundPayment,
  fetchPaymentAmount,
  fetchRazorpayRefund,
  type RazorpayRefundResponse,
} from "@/lib/payments/razorpay";
import {
  createRefundSucceededNotification,
  createRefundFailedNotification,
} from "@/lib/db/notifications";

export type ProcessRefundResult =
  | { ok: true; status: "SUCCESS"; refundId: string; razorpayRefundId: string }
  | { ok: true; status: "PENDING"; refundId: string; razorpayRefundId?: string }
  | { ok: true; status: "ALREADY_REFUNDED"; refundId: string }
  | { ok: false; error: string; status: 400 | 404 | 500 | 502; refundId?: string; notFound?: boolean };

type OrderInfo = { id: string; razorpayPaymentId: string };

export async function processOrderRefund(orderId: string): Promise<ProcessRefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      orderStatus: true,
      razorpayPaymentId: true,
    },
  });

  if (!order) {
    return { ok: false, error: "Order not found.", status: 404 as 500, notFound: true };
  }

  if (order.paymentStatus !== "PAID") {
    return { ok: false, error: "Order is not paid. No refund needed.", status: 400 };
  }

  const razorpayPaymentId = order.razorpayPaymentId;
  if (!razorpayPaymentId) {
    return { ok: false, error: "No Razorpay payment ID for this order.", status: 400 };
  }

  const orderInfo: OrderInfo = { id: order.id, razorpayPaymentId };

  const existing = await getRefundByOrderId(orderId);

  if (existing && (existing.status === "SUCCESS" || existing.status === "PROCESSING")) {
    return handleExistingRefund(existing);
  }

  if (existing && existing.status === "FAILED") {
    return attemptRazorpayRefundWithReconciliation(existing, orderInfo);
  }

  if (existing && existing.status === "PENDING") {
    return attemptRefundAndApply(existing, orderInfo);
  }

  const refund = await createInitialRefund(orderInfo);
  if (!refund) {
    const recheck = await getRefundByOrderId(orderId);
    if (recheck) {
      if (recheck.status === "SUCCESS" || recheck.status === "PROCESSING") {
        return handleExistingRefund(recheck);
      }
      return attemptRefundAndApply(recheck, orderInfo);
    }
    return { ok: false, error: "Could not determine refund amount from Razorpay.", status: 500 };
  }

  return attemptRefundAndApply(refund, orderInfo);
}

async function createInitialRefund(order: OrderInfo): Promise<RefundRecord | null> {
  const amount = await resolveRefundAmount(order.razorpayPaymentId);
  if (!amount) {
    return null;
  }

  const idempotencyKey = generateIdempotencyKey(order.id);
  return tryCreateRefundRecord({
    orderId: order.id,
    razorpayPaymentId: order.razorpayPaymentId,
    idempotencyKey,
    amount,
    currency: "INR",
  });
}

function handleExistingRefund(refund: RefundRecord): ProcessRefundResult {
  if (refund.status === "SUCCESS") {
    return {
      ok: true,
      status: "ALREADY_REFUNDED",
      refundId: refund.id,
    };
  }
  return {
    ok: true,
    status: "PENDING",
    refundId: refund.id,
    razorpayRefundId: refund.razorpayRefundId ?? undefined,
  };
}

async function attemptRefundAndApply(
  refund: RefundRecord,
  order: OrderInfo,
): Promise<ProcessRefundResult> {
  const result = await attemptRazorpayRefund(refund, order);

  if (result.ok) {
    if (result.razorpayStatus === "pending") {
      return {
        ok: true,
        status: "PENDING",
        refundId: refund.id,
        razorpayRefundId: result.razorpayRefundId,
      };
    }
    return {
      ok: true,
      status: "SUCCESS",
      refundId: refund.id,
      razorpayRefundId: result.razorpayRefundId,
    };
  }

  return {
    ok: false,
    error: result.error,
    status: 502,
    refundId: refund.id,
  };
}

async function attemptRazorpayRefundWithReconciliation(
  refund: RefundRecord,
  order: OrderInfo,
): Promise<ProcessRefundResult> {
  if (refund.razorpayRefundId) {
    const fetched = await fetchRazorpayRefund(refund.razorpayRefundId);
    if (fetched) {
      if (fetched.status === "processed") {
        await markRefundSuccess(refund.id, fetched.id);
        void createRefundSucceededNotification(order.id).catch(() => undefined);
        return {
          ok: true,
          status: "SUCCESS",
          refundId: refund.id,
          razorpayRefundId: fetched.id,
        };
      }
      if (fetched.status === "failed") {
        await markRefundFailed(refund.id, "Razorpay reported refund as failed.");
        void createRefundFailedNotification(order.id).catch(() => undefined);
        return {
          ok: false,
          error: "Refund failed.",
          status: 502,
          refundId: refund.id,
        };
      }
    }
  }

  return attemptRefundAndApply(refund, order);
}

async function attemptRazorpayRefund(
  refund: RefundRecord,
  order: OrderInfo,
): Promise<
  | { ok: true; razorpayRefundId: string; razorpayStatus: "pending" | "processed" }
  | { ok: false; error: string }
> {
  const amount = await resolveRefundAmount(order.razorpayPaymentId);
  if (!amount) {
    return { ok: false, error: "Could not determine refund amount from Razorpay." };
  }

  let result: RazorpayRefundResponse;
  try {
    result = await refundPayment({
      razorpayPaymentId: order.razorpayPaymentId,
      amountPaise: refund.amount,
      idempotencyKey: refund.idempotencyKey,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    await markRefundFailed(refund.id, reason).catch(() => undefined);
    void createRefundFailedNotification(order.id).catch(() => undefined);
    return { ok: false, error: `Razorpay refund failed: ${reason}` };
  }

  if (refund.razorpayRefundId === null) {
    await updateRefundRazorpayId(refund.id, result.id).catch(() => undefined);
  }

  if (result.status === "processed") {
    await markRefundSuccess(refund.id, result.id);
    void createRefundSucceededNotification(refund.orderId).catch(() => undefined);
    return { ok: true, razorpayRefundId: result.id, razorpayStatus: "processed" };
  }

  if (result.status === "pending") {
    await markRefundProcessing(refund.id).catch(() => undefined);
    return { ok: true, razorpayRefundId: result.id, razorpayStatus: "pending" };
  }

  await markRefundFailed(refund.id, `Razorpay refund status: ${result.status}`).catch(() => undefined);
  void createRefundFailedNotification(order.id).catch(() => undefined);
  return { ok: false, error: `Razorpay refund failed with status: ${result.status}` };
}

async function resolveRefundAmount(razorpayPaymentId: string): Promise<number | null> {
  const fetched = await fetchPaymentAmount({ razorpayPaymentId });
  if (fetched && fetched.captured && fetched.amount > 0) {
    return fetched.amount;
  }
  return null;
}

export async function retryFailedRefund(orderId: string): Promise<ProcessRefundResult> {
  return processOrderRefund(orderId);
}

export async function getRefundState(orderId: string): Promise<RefundStatus | null> {
  const refund = await getRefundByOrderId(orderId);
  return refund?.status ?? null;
}
