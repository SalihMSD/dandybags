import { type Prisma, type ReturnStatus, type ReturnResolution } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";

export type ReturnRequestWithItems = Prisma.ReturnRequestGetPayload<{
  include: {
    items: {
      select: { sku: true; qty: true; condition: true; reason: true };
    };
    order: {
      select: { id: true; userId: true; totalLabel: true; paymentStatus: true; orderStatus: true; razorpayPaymentId: true };
    };
    refund: {
      select: { id: true; status: true; amount: true; razorpayRefundId: true; failureReason: true };
    };
  };
}>;

export type PublicReturnItem = {
  sku: string;
  qty: number;
  condition: string | null;
  reason: string | null;
};

export type PublicReturnRequest = {
  id: string;
  orderId: string;
  status: ReturnStatus;
  resolution: ReturnResolution;
  reason: string;
  note: string | null;
  refundAmount: number | null;
  exchangeVariantSku: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PublicReturnItem[];
  refund: {
    id: string;
    status: string;
    amount: number;
    razorpayRefundId: string | null;
    failureReason: string | null;
  } | null;
};

function publicReturnRequest(returnRequest: ReturnRequestWithItems): PublicReturnRequest {
  return {
    id: returnRequest.id,
    orderId: returnRequest.orderId,
    status: returnRequest.status,
    resolution: returnRequest.resolution,
    reason: returnRequest.reason,
    note: returnRequest.note,
    refundAmount: returnRequest.refundAmount,
    exchangeVariantSku: returnRequest.exchangeVariantSku,
    adminNote: returnRequest.adminNote,
    processedAt: returnRequest.processedAt ? returnRequest.processedAt.toISOString() : null,
    createdAt: returnRequest.createdAt.toISOString(),
    updatedAt: returnRequest.updatedAt.toISOString(),
    items: returnRequest.items.map((item) => ({
      sku: item.sku,
      qty: item.qty,
      condition: item.condition,
      reason: item.reason,
    })),
    refund: returnRequest.refund
      ? {
          id: returnRequest.refund.id,
          status: returnRequest.refund.status,
          amount: returnRequest.refund.amount,
          razorpayRefundId: returnRequest.refund.razorpayRefundId,
          failureReason: returnRequest.refund.failureReason,
        }
      : null,
  };
}

const returnInclude = {
  items: {
    select: { sku: true, qty: true, condition: true, reason: true },
    orderBy: { sku: "asc" as const },
  },
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
  refund: {
    select: {
      id: true,
      status: true,
      amount: true,
      razorpayRefundId: true,
      failureReason: true,
    },
  },
};

export async function listCustomerReturns(userId: string) {
  const returns = await prisma.returnRequest.findMany({
    where: { userId },
    include: returnInclude,
    orderBy: { createdAt: "desc" },
  });
  return returns.map(publicReturnRequest);
}

export async function getCustomerReturn(userId: string, returnId: string) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: returnInclude,
  });
  if (!returnRequest || returnRequest.userId !== userId) return null;
  return publicReturnRequest(returnRequest);
}

export async function getCustomerReturnByOrderId(userId: string, orderId: string) {
  const returnRequest = await prisma.returnRequest.findFirst({
    where: { orderId, userId },
    include: returnInclude,
    orderBy: { createdAt: "desc" },
  });
  if (!returnRequest) return null;
  return publicReturnRequest(returnRequest);
}

export async function getOrderReturnForAdmin(orderId: string) {
  const returnRequest = await prisma.returnRequest.findFirst({
    where: { orderId },
    include: returnInclude,
    orderBy: { createdAt: "desc" },
  });
  if (!returnRequest) return null;
  return publicReturnRequest(returnRequest);
}

export async function createReturnRequest(input: {
  orderId: string;
  userId: string;
  resolution: ReturnResolution;
  reason: string;
  note?: string;
  exchangeVariantSku?: string | null;
  items: { sku: string; qty: number; condition?: string | null; reason?: string | null }[];
}): Promise<ReturnRequestWithItems> {
  const returnRequest = await prisma.returnRequest.create({
    data: {
      id: newId("ret"),
      orderId: input.orderId,
      userId: input.userId,
      resolution: input.resolution,
      reason: input.reason,
      note: input.note || null,
      exchangeVariantSku: input.exchangeVariantSku || null,
      items: {
        create: input.items.map((item) => ({
          id: newId("rit"),
          sku: item.sku,
          qty: item.qty,
          condition: item.condition || null,
          reason: item.reason || null,
        })),
      },
    },
    include: returnInclude,
  });
  return returnRequest;
}

export async function updateReturnStatus(
  returnId: string,
  status: ReturnStatus,
  adminNote?: string,
): Promise<ReturnRequestWithItems | null> {
  const data: Prisma.ReturnRequestUpdateInput = { status };
  if (adminNote !== undefined) {
    data.adminNote = adminNote;
  }
  if (status === "APPROVED" || status === "REJECTED") {
    data.processedAt = new Date();
  }

  try {
    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data,
      include: returnInclude,
    });
    return updated;
  } catch {
    return null;
  }
}

export async function updateReturnRefund(
  returnId: string,
  refundId: string,
  refundAmount: number,
): Promise<ReturnRequestWithItems | null> {
  try {
    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        refundId,
        refundAmount,
      },
      include: returnInclude,
    });
    return updated;
  } catch {
    return null;
  }
}

export async function updateReturnToCompleted(returnId: string): Promise<ReturnRequestWithItems | null> {
  try {
    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
      },
      include: returnInclude,
    });
    return updated;
  } catch {
    return null;
  }
}

export async function getAdminReturns(params: { status?: string; resolution?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") {
    where.status = params.status as ReturnStatus;
  }
  if (params.resolution && params.resolution !== "ALL") {
    where.resolution = params.resolution as ReturnResolution;
  }

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      include: returnInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returns: returns.map(publicReturnRequest),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function listReturnableOrdersForUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      paymentStatus: "PAID",
      orderStatus: { in: ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] },
    },
    select: {
      id: true,
      createdAt: true,
      totalLabel: true,
      paymentStatus: true,
      orderStatus: true,
      items: {
        select: { sku: true, name: true, qty: true },
        orderBy: { sku: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return orders;
}

export async function canRequestReturn(userId: string, orderId: string) {
  const existingReturn = await prisma.returnRequest.findFirst({
    where: { orderId, userId, status: { in: ["REQUESTED", "APPROVED"] } },
    select: { id: true },
  });
  if (existingReturn) return false;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, paymentStatus: true, orderStatus: true, deliveredAt: true },
  });
  if (!order || order.userId !== userId) return false;
  if (order.paymentStatus !== "PAID") return false;
  if (!["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.orderStatus)) return false;

  return true;
}

export async function getOrderForReturn(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      totalLabel: true,
      paymentStatus: true,
      orderStatus: true,
      razorpayPaymentId: true,
      deliveredAt: true,
      shippedAt: true,
      items: {
        select: { sku: true, name: true, qty: true },
        orderBy: { sku: "asc" },
      },
    },
  });
  if (!order || order.userId !== userId) return null;
  return order;
}