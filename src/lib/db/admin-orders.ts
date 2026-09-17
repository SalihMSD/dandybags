import { type OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";
import { canTransition, isOrderStatus, parseDeliveryField } from "@/lib/db/order-status";
import { parseTotalLabel } from "@/lib/db/analytics";
import { processOrderRefund } from "@/lib/payments/refund";
import { createRefundSucceededNotification, createRefundFailedNotification } from "@/lib/db/notifications";

const orderInclude = {
  items: { orderBy: { sku: "asc" as const } },
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  refund: {
    select: {
      id: true,
      status: true,
      razorpayRefundId: true,
      amount: true,
      failureReason: true,
      completedAt: true,
      idempotencyKey: true,
    },
  },
  returnRequests: {
    select: {
      id: true,
      status: true,
    },
  },
} satisfies Prisma.OrderInclude;

function publicAdminOrder(
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
) {
  return {
    ...publicOrder({
      ...order,
      returnStatus: order.returnRequests[0]?.status ?? null,
    }),
    customer: {
      id: order.user.id,
      fullName: order.user.fullName,
      email: order.user.email,
      phone: order.user.phone,
    },
    refund: order.refund
      ? {
          id: order.refund.id,
          status: order.refund.status,
          razorpayRefundId: order.refund.razorpayRefundId,
          amount: order.refund.amount,
          failureReason: order.refund.failureReason,
          completedAt: order.refund.completedAt ? order.refund.completedAt.toISOString() : null,
          idempotencyKey: order.refund.idempotencyKey,
        }
      : null,
  };
}

export type AdminOrderFilters = {
  search?: string;
  paymentStatus?: string;
  orderStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminOrders() {
  const orders = await prisma.order.findMany({
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(publicAdminOrder);
}

export async function listAdminOrdersFiltered(params: AdminOrderFilters) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    const isId = s.startsWith("DND-");
    where.OR = [
      { id: isId ? { equals: s } : undefined },
      { user: { fullName: { contains: s, mode: "insensitive" } } },
      { user: { email: { contains: s, mode: "insensitive" } } },
      { user: { phone: { contains: s, mode: "insensitive" } } },
      { shippingProvider: { contains: s, mode: "insensitive" } },
      { trackingNumber: { contains: s, mode: "insensitive" } },
    ].filter(Boolean);
  }

  if (params.paymentStatus && params.paymentStatus !== "ALL") {
    where.paymentStatus = params.paymentStatus as "PENDING" | "PAID" | "FAILED";
  }

  if (params.orderStatus && params.orderStatus !== "ALL") {
    where.orderStatus = params.orderStatus as OrderStatus;
  }

  if (params.startDate) {
    const start = new Date(params.startDate);
    start.setHours(0, 0, 0, 0);
    where.AND = where.AND || [];
    (where.AND as Array<Record<string, unknown>>).push({ createdAt: { gte: start } });
  }

  if (params.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    where.AND = where.AND || [];
    (where.AND as Array<Record<string, unknown>>).push({ createdAt: { lte: end } });
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map(publicAdminOrder),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAdminOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order) return null;
  return publicAdminOrder(order);
}

export async function updateAdminOrder(orderId: string, body: Record<string, unknown>) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!existing) return { ok: false as const, error: "Order not found.", status: 404 as const };

  const provider = parseDeliveryField(body.shippingProvider ?? existing.shippingProvider, 80);
  const tracking = parseDeliveryField(body.trackingNumber ?? existing.trackingNumber, 64);
  if (provider === null) return { ok: false as const, error: "Please enter a valid courier name.", status: 400 as const };
  if (tracking === null) return { ok: false as const, error: "Please enter a valid tracking number.", status: 400 as const };

  let nextStatus: OrderStatus = existing.orderStatus;
  if (body.orderStatus != null && String(body.orderStatus).trim() !== "") {
    const requested = String(body.orderStatus).trim();
    if (!isOrderStatus(requested)) {
      return { ok: false as const, error: "Invalid order status.", status: 400 as const };
    }
    if (requested !== existing.orderStatus && !canTransition(existing.orderStatus, requested)) {
      return { ok: false as const, error: "This status change is not allowed.", status: 400 as const };
    }
    nextStatus = requested;
  }

  if (nextStatus === "SHIPPED") {
    if (!provider || !tracking) {
      return {
        ok: false as const,
        error: "Enter the courier and tracking number before marking the order shipped.",
        status: 400 as const,
      };
    }
  }

  const data: Prisma.OrderUpdateInput = {
    shippingProvider: provider || null,
    trackingNumber: tracking || null,
    orderStatus: nextStatus,
  };

  if (nextStatus === "SHIPPED" && !existing.shippedAt) {
    data.shippedAt = new Date();
  }
  if (nextStatus === "DELIVERED" && !existing.deliveredAt) {
    data.deliveredAt = new Date();
  }

  // Stock restoration: if a PAID order is cancelled, restore any numeric stock
  // that was atomically deducted when the payment.captured webhook fired.
  // Null-stock products are skipped (they were never deducted).
  // Non-PAID orders (PENDING/FAILED) never had stock deducted — no restoration.
  //
  // Cancellation uses an atomic updateMany guarded by orderStatus: "PLACED"
  // so that concurrent admin requests cannot double-restore stock. If the
  // order has already been cancelled or moved to CONFIRMED+, the update
  // affects 0 rows and we return an error instead of silently succeeding.
  if (nextStatus === "CANCELLED") {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.updateMany({
        where: { id: orderId, orderStatus: "PLACED" },
        data,
      });

      if (cancelled.count === 0) {
        return null;
      }

      if (existing.paymentStatus === "PAID") {
        for (const item of existing.items) {
          await tx.product.updateMany({
            where: { sku: item.sku, stock: { not: null } },
            data: { stock: { increment: item.qty } },
          });
        }
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
      });
    });

    if (!updatedOrder) {
      return { ok: false as const, error: "This order can no longer be cancelled.", status: 400 as const };
    }

    return { ok: true as const, order: publicAdminOrder(updatedOrder) };
  }

  // Standard path: non-cancellation updates, or cancellation of non-PAID orders.
  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
    include: orderInclude,
  });
  return { ok: true as const, order: publicAdminOrder(updated) };
}

export async function cancelAdminOrder(orderId: string) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      ...orderInclude,
      refund: { select: { id: true, status: true, idempotencyKey: true, razorpayRefundId: true } },
    },
  });
  if (!existing) return { ok: false as const, error: "Order not found.", status: 404 as const };

  if (existing.orderStatus !== "PLACED") {
    return { ok: false as const, error: "This order can no longer be cancelled.", status: 400 as const };
  }

  const isPaid = existing.paymentStatus === "PAID";

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.order.updateMany({
      where: { id: orderId, orderStatus: "PLACED" },
      data: { orderStatus: "CANCELLED" },
    });

    if (cancelled.count === 0) {
      return null;
    }

    if (isPaid) {
      for (const item of existing.items) {
        await tx.product.updateMany({
          where: { sku: item.sku, stock: { not: null } },
          data: { stock: { increment: item.qty } },
        });
      }
    }

    return tx.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
  });

  if (!updatedOrder) {
    return { ok: false as const, error: "This order can no longer be cancelled.", status: 400 as const };
  }

  const order = publicAdminOrder(updatedOrder);

  let refundStatus: "not_applicable" | "SUCCESS" | "PROCESSING" | "PENDING" | "FAILED" | "already_refunded" | "error" = "not_applicable";
  let refundError: string | undefined;

  if (isPaid) {
    if (existing.refund && existing.refund.status === "SUCCESS") {
      refundStatus = "already_refunded";
    } else {
      const refundResult = await processOrderRefund(orderId);
      if (refundResult.ok) {
        if (refundResult.status === "SUCCESS") {
          refundStatus = "SUCCESS";
        } else if (refundResult.status === "ALREADY_REFUNDED") {
          refundStatus = "already_refunded";
        } else {
          refundStatus = "PROCESSING";
        }
      } else {
        refundStatus = "error";
        refundError = refundResult.error;
        void createRefundFailedNotification(orderId).catch(() => undefined);
      }
    }
  }

  return { ok: true as const, order, refundStatus, refundError };
}

export { parseTotalLabel };
