import { PRICE_PLACEHOLDER } from "@/lib/site";
import { prisma } from "@/lib/db/prisma";
import { parseQty } from "@/lib/db/cart";
import { newId } from "@/lib/db/store";

export type PublicOrderItem = {
  sku: string;
  slug: string;
  name: string;
  qty: number;
  image: string;
  unitPrice: number | null;
};

export type PublicOrder = {
  id: string;
  userId: string;
  items: PublicOrderItem[];
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
  };
  shippingProvider: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  returnStatus: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED" | null;
};

export function publicOrder(order: {
  id: string;
  userId: string;
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
  shipFullName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipLandmark: string;
  shippingProvider?: string | null;
  trackingNumber?: string | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  returnStatus?: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED" | null;
  items: {
    sku: string;
    slug: string;
    name: string;
    qty: number;
    image: string;
    unitPrice: { toString(): string } | null;
  }[];
}): PublicOrder {
  return {
    id: order.id,
    userId: order.userId,
    items: order.items.map((item) => ({
      sku: item.sku,
      slug: item.slug,
      name: item.name,
      qty: item.qty,
      image: item.image,
      unitPrice: item.unitPrice == null ? null : Number(item.unitPrice.toString()),
    })),
    totalLabel: order.totalLabel,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    shippingAddress: {
      fullName: order.shipFullName,
      phone: order.shipPhone,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      state: order.shipState,
      pincode: order.shipPincode,
      landmark: order.shipLandmark,
    },
    shippingProvider: order.shippingProvider ?? null,
    trackingNumber: order.trackingNumber ?? null,
    shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    returnStatus: order.returnStatus ?? null,
  };
}

const orderInclude = {
  items: { orderBy: { sku: "asc" as const } },
  returnRequests: {
    select: {
      id: true,
      status: true,
    },
  },
};

export async function listCustomerOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map((order) =>
    publicOrder({
      ...order,
      returnStatus: order.returnRequests[0]?.status ?? null,
    }),
  );
}

export async function getCustomerOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order || order.userId !== userId) return null;
  return publicOrder({
    ...order,
    returnStatus: order.returnRequests[0]?.status ?? null,
  });
}

export async function checkoutCustomerOrder(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) {
    return { ok: false as const, error: "Please select a delivery address.", status: 400 as const };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) {
    return { ok: false as const, error: "User not found.", status: 400 as const };
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart?.items.length) {
    return { ok: false as const, error: "Your cart is empty.", status: 400 as const };
  }

  for (const item of cart.items) {
    const qty = parseQty(item.qty);
    if (qty == null || qty !== item.qty) {
      return { ok: false as const, error: "Your cart is empty.", status: 400 as const };
    }
    if (!item.product || item.product.sku !== item.sku) {
      return { ok: false as const, error: "Your cart is empty.", status: 400 as const };
    }
    if (!item.product.b2cAvailable) {
      return { ok: false as const, error: "Your cart is empty.", status: 400 as const };
    }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: `DND-${newId("ord").slice(-8).toUpperCase()}`,
          userId,
          totalLabel: PRICE_PLACEHOLDER,
          paymentStatus: "PENDING",
          orderStatus: "PLACED",
          shipFullName: address.fullName,
          shipPhone: address.phone,
          shipLine1: address.line1,
          shipLine2: address.line2,
          shipCity: address.city,
          shipState: address.state,
          shipPincode: address.pincode,
          shipLandmark: address.landmark,
          shipEmail: user.email,
          items: {
            create: cart.items.map((item) => ({
              id: newId("oit"),
              sku: item.product.sku,
              slug: item.product.slug,
              name: item.product.name,
              qty: item.qty,
              image: item.product.imageFront,
              unitPrice: item.product.sellingPrice,
            })),
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    return { ok: true as const, order: publicOrder({ ...order, returnStatus: order.returnRequests?.[0]?.status ?? null }) };
  } catch {
    return { ok: false as const, error: "Something went wrong. Please try again.", status: 500 as const };
  }
}

export async function cancelCustomerOrder(userId: string, orderId: string) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { sku: "asc" as const } } },
  });

  if (!existing || existing.userId !== userId) {
    return { ok: false as const, error: "Order not found.", status: 404 as const };
  }

  if (existing.orderStatus !== "PLACED") {
    return { ok: false as const, error: "This order can no longer be cancelled.", status: 400 as const };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: orderId, orderStatus: "PLACED" },
        data: { orderStatus: "CANCELLED" },
      });

      if (result.count === 0) {
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

    if (!updated) {
      return { ok: false as const, error: "This order can no longer be cancelled.", status: 400 as const };
    }

    return { ok: true as const, order: publicOrder({ ...updated, returnStatus: updated.returnRequests?.[0]?.status ?? null }) };
  } catch {
    return { ok: false as const, error: "Something went wrong. Please try again.", status: 500 as const };
  }
}
