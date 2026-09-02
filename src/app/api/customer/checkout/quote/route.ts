import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { validateCoupon, listUserCoupons } from "@/lib/db/coupons";
import { parseCartItems } from "@/lib/db/cart";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const items = parseCartItems(body.items);
  if (!items.length) {
    return jsonError("Your cart is empty.", 400);
  }

  let user = null;
  try {
    user = await requireCustomer();
  } catch {
    // Guest checkout - user stays null
  }

  const skus = items.map((i) => i.sku);
  const products = await prisma.product.findMany({
    where: { sku: { in: skus } },
  });

  const lineItems: Array<{
    sku: string;
    slug: string;
    name: string;
    image: string;
    qty: number;
    sellingPrice: number;
    mrp: number | null;
    discountPercent: number;
    lineTotal: number;
    stock: number | null;
    b2cAvailable: boolean;
  }> = [];

  let subtotal = 0;
  let hasError = false;
  let errorMessage = "";

  for (const item of items) {
    const product = products.find((p) => p.sku === item.sku);
    if (!product) {
      hasError = true;
      errorMessage = `Product "${item.sku}" is no longer available.`;
      break;
    }
    if (!product.b2cAvailable) {
      hasError = true;
      errorMessage = `Product "${product.name}" is not available for purchase.`;
      break;
    }
    if (product.stock !== null && product.stock < item.qty) {
      hasError = true;
      const available = product.stock;
      errorMessage =
        available === 0
          ? `Sorry, "${product.name}" is out of stock.`
          : `Sorry, "${product.name}" only has ${available} item(s) left in stock.`;
      break;
    }

    const sellingPrice = product.sellingPrice ? Number(product.sellingPrice.toString()) : 0;
    const mrp = product.mrp ? Number(product.mrp.toString()) : null;
    const qty = item.qty;
    const lineTotal = sellingPrice * qty;

    lineItems.push({
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      image: product.imageFront,
      qty,
      sellingPrice,
      mrp,
      discountPercent: product.discountPercent || 0,
      lineTotal,
      stock: product.stock,
      b2cAvailable: product.b2cAvailable,
    });

    subtotal += lineTotal;
  }

  if (hasError) {
    return jsonError(errorMessage, 400);
  }

  // Coupon validation server-side
  let coupon = null;
  let discount = 0;
  let finalAmount = subtotal;

  const couponCode = String(body.couponCode || "").trim().toUpperCase() || undefined;
  if (couponCode) {
    if (!user) {
      // For guests, validate coupon exists and is applicable
      const result = await validateCoupon(couponCode, "", subtotal);
      if (!result.ok) {
        return jsonError(result.error, 400);
      }
      coupon = { code: result.coupon.code, discountType: result.coupon.discountType, discountValue: result.coupon.discountValue };
      discount = result.discount;
      finalAmount = result.finalAmount;
    } else {
      const result = await validateCoupon(couponCode, user.id, subtotal);
      if (!result.ok) {
        return jsonError(result.error, 400);
      }
      coupon = { code: result.coupon.code, discountType: result.coupon.discountType, discountValue: result.coupon.discountValue };
      discount = result.discount;
      finalAmount = result.finalAmount;
    }
  }

  // Fetch user's available coupons for the "Select from My Coupons" feature
  let availableCoupons: Array<{ code: string; discountType: string; discountValue: number; sourceBillAmount: number | null; rewardPercentage: number | null; expires: string }> | null = null;
  if (user) {
    const userCoupons = await listUserCoupons(user.id);
    availableCoupons = userCoupons
      .filter((c) => c.status === "ACTIVE" && c.isActive)
      .map((c) => ({
        code: c.code,
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        sourceBillAmount: c.sourceBillAmount,
        rewardPercentage: c.rewardPercentage,
        expires: c.validUntil,
      }));
  }

  return Response.json({
    ok: true,
    items: lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100,
    coupon: coupon
      ? {
          code: coupon.code,
          type: coupon.discountType,
          value: coupon.discountValue,
        }
      : null,
    availableCoupons,
  });
}
