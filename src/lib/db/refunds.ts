import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import type { RefundStatus } from "@prisma/client";

export type RefundRecord = {
  id: string;
  orderId: string;
  razorpayPaymentId: string;
  razorpayRefundId: string | null;
  idempotencyKey: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  failureReason: string | null;
  requestedAt: Date;
  completedAt: Date | null;
};

export type RazorpayRefundStatus = "pending" | "processed" | "failed";

const refundSelect = {
  id: true,
  orderId: true,
  razorpayPaymentId: true,
  razorpayRefundId: true,
  idempotencyKey: true,
  amount: true,
  currency: true,
  status: true,
  failureReason: true,
  requestedAt: true,
  completedAt: true,
};

function buildRefundRecord(refund: {
  id: string;
  orderId: string;
  razorpayPaymentId: string;
  razorpayRefundId: string | null;
  idempotencyKey: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  failureReason: string | null;
  requestedAt: Date;
  completedAt: Date | null;
}): RefundRecord {
  return {
    ...refund,
    status: refund.status as RefundStatus,
  };
}

async function fetchRefundRecord(id: string): Promise<RefundRecord | null> {
  const refund = await prisma.refund.findUnique({
    where: { id },
    select: refundSelect,
  });
  if (!refund) return null;
  return buildRefundRecord(refund);
}

export async function getRefundByOrderId(orderId: string): Promise<RefundRecord | null> {
  const refund = await prisma.refund.findUnique({
    where: { orderId },
    select: refundSelect,
  });
  if (!refund) return null;
  return buildRefundRecord(refund);
}

export async function getRefundById(id: string): Promise<RefundRecord | null> {
  return fetchRefundRecord(id);
}

export function generateIdempotencyKey(orderId: string): string {
  return `ref_${orderId}_${newId("rk")}`;
}

export async function createRefundRecord(input: {
  orderId: string;
  razorpayPaymentId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
}): Promise<RefundRecord> {
  const refund = await prisma.refund.create({
    data: {
      id: newId("ref"),
      orderId: input.orderId,
      razorpayPaymentId: input.razorpayPaymentId,
      idempotencyKey: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency,
      status: "PENDING",
    },
  });
  return buildRefundRecord(refund);
}

export async function tryCreateRefundRecord(input: {
  orderId: string;
  razorpayPaymentId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
}): Promise<RefundRecord | null> {
  try {
    return await createRefundRecord(input);
  } catch {
    return null;
  }
}

export async function markRefundProcessing(id: string): Promise<RefundRecord | null> {
  try {
    await prisma.refund.update({
      where: { id },
      data: { status: "PROCESSING" },
    });
    return fetchRefundRecord(id);
  } catch {
    return null;
  }
}

export async function markRefundSuccess(
  id: string,
  razorpayRefundId: string,
): Promise<RefundRecord> {
  await prisma.refund.update({
    where: { id },
    data: {
      status: "SUCCESS",
      razorpayRefundId,
      completedAt: new Date(),
    },
  });
  const refund = await fetchRefundRecord(id);
  if (!refund) {
    throw new Error("Refund not found after success update");
  }
  return refund;
}

export async function markRefundFailed(
  id: string,
  reason: string,
): Promise<RefundRecord> {
  await prisma.refund.update({
    where: { id },
    data: {
      status: "FAILED",
      failureReason: reason,
    },
  });
  const refund = await fetchRefundRecord(id);
  if (!refund) {
    throw new Error("Refund not found after failure update");
  }
  return refund;
}

export async function updateRefundRazorpayId(
  id: string,
  razorpayRefundId: string,
): Promise<RefundRecord | null> {
  try {
    await prisma.refund.update({
      where: { id },
      data: { razorpayRefundId },
    });
    return fetchRefundRecord(id);
  } catch {
    return null;
  }
}

export async function getRefundableOrders(): Promise<
  Array<{
    orderId: string;
    razorpayPaymentId: string | null;
    paymentStatus: string;
    orderStatus: string;
    refundId: string | null;
    refundStatus: RefundStatus | null;
  }>
> {
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: "PAID",
      razorpayPaymentId: { not: null },
    },
    select: {
      id: true,
      razorpayPaymentId: true,
      paymentStatus: true,
      orderStatus: true,
      refund: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => ({
    orderId: o.id,
    razorpayPaymentId: o.razorpayPaymentId,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    refundId: o.refund?.id ?? null,
    refundStatus: o.refund?.status
      ? (o.refund.status as RefundStatus)
      : null,
  }));
}
