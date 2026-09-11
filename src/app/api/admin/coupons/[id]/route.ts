import { jsonError, originOk } from "@/lib/auth/helpers";
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

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return jsonError("Coupon not found.", 404);

  const data: Record<string, unknown> = {};

  if (body.discountValue !== undefined) {
    const val = Number(body.discountValue);
    if (isNaN(val) || val <= 0) return jsonError("Discount value must be greater than 0.", 400);
    data.discountValue = val;
  }

  if (body.minimumOrderValue !== undefined) {
    data.minimumOrderValue = body.minimumOrderValue ? Number(body.minimumOrderValue) : null;
  }

  if (body.maximumDiscount !== undefined) {
    data.maximumDiscount = body.maximumDiscount ? Number(body.maximumDiscount) : null;
  }

  if (body.usageLimit !== undefined) {
    const ul = Number(body.usageLimit);
    if (isNaN(ul) || ul < 1) return jsonError("Usage limit must be at least 1.", 400);
    data.usageLimit = ul;
  }

  if (body.validUntil !== undefined) {
    const d = parseDate(body.validUntil as string);
    if (!d) return jsonError("Invalid valid-until date.", 400);
    data.validUntil = d;
  }

  if (body.isActive !== undefined) {
    data.isActive = body.isActive === true;
  }

  if (body.action === "expire") {
    data.isActive = false;
    data.status = "EXPIRED";
  }

  if (body.action === "disable") {
    data.isActive = false;
  }

  if (Object.keys(data).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data,
    });

    return Response.json({ coupon: {
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
      status: coupon.status,
    } });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { id } = await ctx.params;

  const existing = await prisma.coupon.findUnique({
    where: { id },
    select: { id: true, code: true, usedCount: true },
  });
  if (!existing) return jsonError("Coupon not found.", 404);

  if (existing.usedCount > 0) {
    return jsonError(`Cannot delete "${existing.code}": it has been used ${existing.usedCount} time(s). Deactivate it instead.`, 409);
  }

  try {
    await prisma.coupon.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
