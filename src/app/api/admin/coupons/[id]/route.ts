import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { analyzeCoupon } from "@/lib/db/coupons";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { id } = await ctx.params;

  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minimumOrderValue: true,
        maximumDiscount: true,
        usageLimit: true,
        usedCount: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        userId: true,
        status: true,
        sourceOrderId: true,
        sourceBillAmount: true,
        rewardPercentage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!coupon) return jsonError("Coupon not found.", 404);

    const analysis = await analyzeCoupon(coupon.code);

    return Response.json({
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
        sourceOrderId: coupon.sourceOrderId,
        sourceBillAmount: coupon.sourceBillAmount ? Number(coupon.sourceBillAmount) : null,
        rewardPercentage: coupon.rewardPercentage,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
      },
      analysis,
    });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
