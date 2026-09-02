import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";

export type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minimumOrderValue: number | null;
  maximumDiscount: number | null;
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  userId: string | null;
  status: "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  usedAt: string | null;
  sourceOrderId: string | null;
  sourceBillAmount: number | null;
  rewardPercentage: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CouponValidationResult =
  | { ok: true; coupon: Coupon; discount: number; finalAmount: number }
  | { ok: false; error: string };

export async function validateCoupon(
  code: string,
  userId: string,
  orderTotal: number
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon) {
    return { ok: false, error: "Invalid coupon code." };
  }

  if (!coupon.isActive) {
    return { ok: false, error: "This coupon is no longer active." };
  }

  if (coupon.status !== "ACTIVE") {
    return { ok: false, error: "This coupon has already been used or expired." };
  }

  const now = new Date();
  if (now < coupon.validFrom) {
    return { ok: false, error: "This coupon is not yet valid." };
  }

  if (now > coupon.validUntil) {
    return { ok: false, error: "This coupon has expired." };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }

  if (coupon.minimumOrderValue && orderTotal < Number(coupon.minimumOrderValue)) {
    return { ok: false, error: `Minimum order value of ${formatInr(Number(coupon.minimumOrderValue))} required.` };
  }

  if (coupon.userId && coupon.userId !== userId) {
    return { ok: false, error: "This coupon is not valid for your account." };
  }

  if (coupon.discountType === "FIXED" && orderTotal < Number(coupon.discountValue)) {
    return { ok: false, error: `Your cart total must be at least ${formatInr(Number(coupon.discountValue))} to use this coupon.` };
  }

  let discount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discount = (orderTotal * Number(coupon.discountValue)) / 100;
    if (coupon.maximumDiscount) {
      discount = Math.min(discount, Number(coupon.maximumDiscount));
    }
  } else {
    discount = Number(coupon.discountValue);
  }

  discount = Math.max(0, Math.min(discount, orderTotal));
  const finalAmount = Math.max(0, orderTotal - discount);

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minimumOrderValue: coupon.minimumOrderValue ? Number(coupon.minimumOrderValue) : null,
      maximumDiscount: coupon.maximumDiscount ? Number(coupon.maximumDiscount) : null,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      validFrom: coupon.validFrom.toISOString(),
      validUntil: coupon.validUntil.toISOString(),
      isActive: coupon.isActive,
      userId: coupon.userId,
      status: coupon.status,
      usedAt: coupon.usedAt?.toISOString() ?? null,
      sourceOrderId: coupon.sourceOrderId,
      sourceBillAmount: coupon.sourceBillAmount ? Number(coupon.sourceBillAmount) : null,
      rewardPercentage: coupon.rewardPercentage,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    },
    discount: Math.round(discount * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100,
  };
}

export async function markCouponUsed(couponId: string) {
  return prisma.coupon.update({
    where: { id: couponId },
    data: {
      usedCount: { increment: 1 },
      usedAt: new Date(),
      status: "USED",
    },
    select: { id: true, code: true, status: true },
  });
}

export type CouponAnalysis = {
  totalUses: number;
  remainingUses: number;
  ordersUsingCoupon: Array<{
    orderId: string;
    totalLabel: string;
    paymentStatus: string;
    createdAt: string;
  }>;
};

export async function analyzeCoupon(couponCode: string): Promise<CouponAnalysis | null> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase() },
    select: { id: true, usageLimit: true, usedCount: true },
  });

  if (!coupon) return null;

  const orders = await prisma.order.findMany({
    where: { couponId: coupon.id },
    select: { id: true, totalLabel: true, paymentStatus: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    totalUses: orders.length,
    remainingUses: Math.max(0, coupon.usageLimit - coupon.usedCount),
    ordersUsingCoupon: orders.map((o) => ({
      orderId: o.id,
      totalLabel: o.totalLabel,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export async function listUserCoupons(userId: string) {
  const coupons = await prisma.coupon.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return coupons.map((c) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: Number(c.discountValue),
    minimumOrderValue: c.minimumOrderValue ? Number(c.minimumOrderValue) : null,
    maximumDiscount: c.maximumDiscount ? Number(c.maximumDiscount) : null,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    validFrom: c.validFrom.toISOString(),
    validUntil: c.validUntil.toISOString(),
    isActive: c.isActive,
    userId: c.userId,
    status: c.status,
    usedAt: c.usedAt?.toISOString() ?? null,
    sourceOrderId: c.sourceOrderId,
    sourceBillAmount: c.sourceBillAmount ? Number(c.sourceBillAmount) : null,
    rewardPercentage: c.rewardPercentage,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
