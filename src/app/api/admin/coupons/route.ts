import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import { formatInr } from "@/lib/format";
import { analyzeCoupon } from "@/lib/db/coupons";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "50")));
  const skip = (page - 1) * pageSize;

  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { sourceOrderId: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.coupon.count({ where }),
    ]);

    return Response.json({
      coupons: coupons.map((c) => ({
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
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const code = String(body.code || "").trim().toUpperCase() || generateCouponCode();
  const discountType = String(body.discountType || "").toUpperCase() as "PERCENTAGE" | "FIXED";
  const discountValue = Number(body.discountValue);
  const minimumOrderValue = body.minimumOrderValue ? Number(body.minimumOrderValue) : null;
  const maximumDiscount = body.maximumDiscount ? Number(body.maximumDiscount) : null;
  const usageLimit = Number(body.usageLimit) || 1;
  const validFrom = parseDate(body.validFrom as string);
  const validUntil = parseDate(body.validUntil as string);
  const isActive = body.isActive !== undefined ? body.isActive === true : true;

  if (code.length < 3) return jsonError("Coupon code must be at least 3 characters.", 400);
  if (!["PERCENTAGE", "FIXED"].includes(discountType)) return jsonError("Invalid discount type.", 400);
  if (isNaN(discountValue) || discountValue <= 0) return jsonError("Discount value must be greater than 0.", 400);
  if (!validFrom) return jsonError("Valid from date is required.", 400);
  if (!validUntil) return jsonError("Valid until date is required.", 400);
  if (validUntil <= validFrom) return jsonError("Valid until must be after valid from.", 400);
  if (discountType === "PERCENTAGE" && discountValue > 100) return jsonError("Percentage discount cannot exceed 100%.", 400);

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) return jsonError("This coupon code is already in use.", 409);

  try {
    const coupon = await prisma.coupon.create({
      data: {
        id: newId("cpy"),
        code,
        discountType,
        discountValue,
        minimumOrderValue,
        maximumDiscount,
        usageLimit,
        validFrom,
        validUntil,
        isActive,
      },
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
    } }, { status: 201 });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const id = String(body.id || "").trim();
  if (!id) return jsonError("Coupon ID is required.", 400);

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

export async function DELETE(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const id = String(body.id || "").trim();
  if (!id) return jsonError("Coupon ID is required.", 400);

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
