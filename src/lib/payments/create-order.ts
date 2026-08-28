import { parseQty, parseCartItems, replaceCustomerCart } from "@/lib/db/cart";
import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import { formatInr } from "@/lib/format";
import { calculatePayable } from "@/lib/payments/amount";
import {
  createRazorpayTestOrder,
  getRazorpayKeyId,
  razorpayConfigured,
} from "@/lib/payments/razorpay";
import { hashPassword } from "@/lib/db/password";
import { createCustomer, findCustomerByEmailOrPhone } from "@/lib/db/users";
import { normalizePhone, isValidPhone } from "@/lib/auth/validate";
import { validateCoupon } from "@/lib/db/coupons";

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

async function sessionForOrder(
  order: {
    id: string;
    razorpayOrderId: string | null;
    items: { qty: number; unitPrice: { toString(): string } | null }[];
  },
  amountPaiseOverride?: number,
): Promise<
  | { ok: true; session: PaymentSession }
  | { ok: false; error: string; status: 400 | 503 }
> {
  if (!razorpayConfigured()) {
    return { ok: false, error: "Payments are not configured.", status: 503 };
  }
  const payable = payableFromOrderItems(order.items);
  if (!payable.ok) return payable;

  const amountPaise = amountPaiseOverride ?? payable.amountPaise;

  let razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId) {
    const created = await createRazorpayTestOrder({
      amountPaise,
      receipt: order.id,
    });
    if (created.amount !== amountPaise) {
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
      amount: amountPaise,
      currency: "INR",
      orderId: order.id,
    },
  };
}

export async function createCustomerPaymentOrder(userId: string, addressId: string, couponCode?: string) {
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
        if (item.product.stock !== null && item.product.stock < item.qty) {
          const available = item.product.stock;
          return {
            ok: false as const,
            error:
              available === 0
                ? `Sorry, "${item.product.name}" is out of stock.`
                : `Sorry, "${item.product.name}" only has ${available} item(s) left in stock.`,
            status: 400 as const,
          };
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

      let couponId: string | undefined;
      let amountPaise = payable.amountPaise;
      if (couponCode) {
        const couponResult = await validateCoupon(couponCode.toUpperCase(), userId, payable.amountRupees);
        if (!couponResult.ok) {
          return { ok: false as const, error: couponResult.error, status: 400 as const };
        }
        amountPaise = Math.round(couponResult.finalAmount * 100);
        couponId = couponResult.coupon.id;
      }

      if (pending && sameLines(pending.items, cartLines)) {
        return sessionForOrder(pending, amountPaise);
      }

      const created = await prisma.order.create({
        data: {
          id: `DND-${newId("ord").slice(-8).toUpperCase()}`,
          userId,
          totalLabel: formatInr(amountPaise / 100),
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
          couponId,
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

      const session = await sessionForOrder(created, amountPaise);
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
      return sessionForOrder(pending, couponCode ? Math.round((pending.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0)) * 100) : undefined);
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

export async function createGuestPaymentOrder(
  guestDetails: Record<string, unknown>,
  items: unknown,
  couponCode?: string,
) {
  if (!razorpayConfigured()) {
    return { ok: false as const, error: "Payments are not configured.", status: 503 as const };
  }

  const fullName = String(guestDetails.fullName || "").trim();
  const email = String(guestDetails.email || "").trim();
  const phone = normalizePhone(String(guestDetails.phone || ""));
  const line1 = String(guestDetails.line1 || "").trim();
  const line2 = String(guestDetails.line2 || "").trim();
  const city = String(guestDetails.city || "").trim();
  const state = String(guestDetails.state || "").trim();
  const pincode = String(guestDetails.pincode || "").trim();
  const landmark = String(guestDetails.landmark || "").trim();

  if (!fullName || fullName.length < 2) {
    return { ok: false as const, error: "Please enter your full name.", status: 400 as const };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Please enter a valid email address.", status: 400 as const };
  }
  if (!isValidPhone(phone)) {
    return { ok: false as const, error: "Please enter a valid 10-digit mobile number.", status: 400 as const };
  }
  if (!line1 || line1.length < 4) {
    return { ok: false as const, error: "Please enter address line 1.", status: 400 as const };
  }
  if (!city || !state) {
    return { ok: false as const, error: "Please enter city and state.", status: 400 as const };
  }
  if (!/^\d{6}$/.test(pincode)) {
    return { ok: false as const, error: "Please enter a valid 6-digit pincode.", status: 400 as const };
  }

  const cartLines = parseCartItems(items);
  if (!cartLines.length) {
    return { ok: false as const, error: "Your cart is empty.", status: 400 as const };
  }

  const products = await prisma.product.findMany({
    where: { sku: { in: cartLines.map((i) => i.sku) } },
  });
  const productMap = new Map(products.map((p) => [p.sku, p]));

  for (const item of cartLines) {
    const product = productMap.get(item.sku);
    if (!product || !product.b2cAvailable) {
      return { ok: false as const, error: "Your cart contains unavailable items.", status: 400 as const };
    }
    if (product.stock !== null && product.stock < item.qty) {
      const available = product.stock;
      return {
        ok: false as const,
        error:
          available === 0
            ? `Sorry, "${product.name}" is out of stock.`
            : `Sorry, "${product.name}" only has ${available} item(s) left in stock.`,
        status: 400 as const,
      };
    }
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await findCustomerByEmailOrPhone(normalizedEmail, phone);
  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    const randomPassword = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const passwordHash = await hashPassword(randomPassword);
    const user = await createCustomer({ fullName, email: normalizedEmail, phone, passwordHash });
    userId = user.id;
  }

  const address = await prisma.address.create({
    data: {
      id: newId("adr"),
      userId,
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      pincode,
      landmark,
      isDefault: true,
    },
  });

  await replaceCustomerCart(userId, cartLines.map((item) => ({ sku: item.sku, qty: item.qty })));

  return createCustomerPaymentOrder(userId, address.id, couponCode);
}
