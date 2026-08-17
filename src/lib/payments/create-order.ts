import { parseQty } from "@/lib/db/cart";
import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import { formatInr } from "@/lib/format";
import { calculatePayable } from "@/lib/payments/amount";
import {
  createRazorpayTestOrder,
  getRazorpayKeyId,
  razorpayConfigured,
} from "@/lib/payments/razorpay";

export type PaymentSession = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
};

function sameLines(
  a: { sku: string; qty: number }[],
  b: { sku: string; qty: number }[],
) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x.sku.localeCompare(y.sku));
  const right = [...b].sort((x, y) => x.sku.localeCompare(y.sku));
  return left.every((row, i) => row.sku === right[i].sku && row.qty === right[i].qty);
}

function payableFromOrderItems(
  items: { qty: number; unitPrice: { toString(): string } | null }[],
) {
  return calculatePayable(
    items.map((item) => ({
      qty: item.qty,
      sellingPrice: item.unitPrice == null ? null : Number(item.unitPrice.toString()),
      b2cAvailable: true,
    })),
  );
}

async function sessionForOrder(order: {
  id: string;
  razorpayOrderId: string | null;
  items: { qty: number; unitPrice: { toString(): string } | null }[];
}): Promise<
  | { ok: true; session: PaymentSession }
  | { ok: false; error: string; status: 400 | 503 }
> {
  if (!razorpayConfigured()) {
    return { ok: false, error: "Payments are not configured.", status: 503 };
  }
  const payable = payableFromOrderItems(order.items);
  if (!payable.ok) return payable;

  let razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId) {
    const created = await createRazorpayTestOrder({
      amountPaise: payable.amountPaise,
      receipt: order.id,
    });
    if (created.amount !== payable.amountPaise) {
      return { ok: false, error: "Payments are not configured.", status: 503 };
    }
    razorpayOrderId = created.id;
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId },
    });
  }

  return {
    ok: true,
    session: {
      keyId: getRazorpayKeyId(),
      razorpayOrderId,
      amount: payable.amountPaise,
      currency: "INR",
      orderId: order.id,
    },
  };
}

export async function createCustomerPaymentOrder(userId: string, addressId: string) {
  if (!razorpayConfigured()) {
    return { ok: false as const, error: "Payments are not configured.", status: 503 as const };
  }

  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) {
    return { ok: false as const, error: "Please select a delivery address.", status: 400 as const };
  }

  await prisma.$executeRaw`SELECT pg_advisory_lock(hashtext(${userId}))`;
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    const pending = await prisma.order.findFirst({
      where: {
        userId,
        paymentStatus: "PENDING",
        orderStatus: "PLACED",
        razorpayPaymentId: null,
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    const cartLines =
      cart?.items.map((item) => ({
        sku: item.sku,
        qty: item.qty,
        product: item.product,
      })) ?? [];

    if (cartLines.length) {
      for (const item of cartLines) {
        const qty = parseQty(item.qty);
        if (qty == null || qty !== item.qty || !item.product || item.product.sku !== item.sku || !item.product.b2cAvailable) {
          return { ok: false as const, error: "Your cart is empty.", status: 400 as const };
        }
      }

      const payable = calculatePayable(
        cartLines.map((item) => ({
          qty: item.qty,
          sellingPrice: item.product.sellingPrice,
          b2cAvailable: item.product.b2cAvailable,
        })),
      );
      if (!payable.ok) return payable;

      if (pending && sameLines(pending.items, cartLines)) {
        return sessionForOrder(pending);
      }

      const created = await prisma.order.create({
        data: {
          id: `DND-${newId("ord").slice(-8).toUpperCase()}`,
          userId,
          totalLabel: formatInr(payable.amountRupees),
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
          items: {
            create: cartLines.map((item) => ({
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
        include: { items: true },
      });

      const session = await sessionForOrder(created);
      if (!session.ok) {
        await prisma.order.delete({ where: { id: created.id } }).catch(() => undefined);
        return session;
      }

      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
      return session;
    }

    if (pending) {
      return sessionForOrder(pending);
    }

    return { ok: false as const, error: "Your cart is empty.", status: 400 as const };
  } catch (error) {
    if (error instanceof Error && error.message === "RAZORPAY_NOT_CONFIGURED") {
      return { ok: false as const, error: "Payments are not configured.", status: 503 as const };
    }
    return { ok: false as const, error: "Something went wrong. Please try again.", status: 500 as const };
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext(${userId}))`;
  }
}
