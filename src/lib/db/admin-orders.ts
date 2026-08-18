import { type OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";
import { canTransition, isOrderStatus, parseDeliveryField } from "@/lib/db/order-status";

const orderInclude = {
  items: { orderBy: { sku: "asc" as const } },
  user: { select: { id: true, fullName: true, email: true, phone: true } },
} satisfies Prisma.OrderInclude;

function publicAdminOrder(
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
) {
  return {
    ...publicOrder(order),
    customer: {
      id: order.user.id,
      fullName: order.user.fullName,
      email: order.user.email,
      phone: order.user.phone,
    },
  };
}

export async function listAdminOrders() {
  const orders = await prisma.order.findMany({
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(publicAdminOrder);
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
  // The existing canTransition rules guarantee CANCELLED has no further transitions,
  // so this restoration block can never run twice for the same order.
  if (nextStatus === "CANCELLED" && existing.paymentStatus === "PAID") {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Restore numeric stock for each item in the cancelled order.
      for (const item of existing.items) {
        await tx.product.updateMany({
          where: { sku: item.sku, stock: { not: null } },
          data: { stock: { increment: item.qty } },
        });
      }
      return tx.order.update({ where: { id: orderId }, data, include: orderInclude });
    });
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
