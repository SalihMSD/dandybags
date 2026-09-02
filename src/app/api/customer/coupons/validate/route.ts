import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { validateCoupon } from "@/lib/db/coupons";
import { prisma } from "@/lib/db/prisma";
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

  const code = String(body.code || "").trim().toUpperCase();
  if (!code) {
    return jsonError("Coupon code is required.", 400);
  }

  // If items are provided, recalculate orderTotal from DB prices.
  // Never trust a client-supplied orderTotal when items are available.
  let orderTotal: number | null = null;

  const items = parseCartItems(body.items);
  if (items.length > 0) {
    let calculatedTotal = 0;
    const skus = items.map((i) => i.sku);
    const products = await prisma.product.findMany({
      where: { sku: { in: skus } },
    });
    for (const item of items) {
      const product = products.find((p) => p.sku === item.sku);
      if (!product) {
        return jsonError(`Product "${item.sku}" is no longer available.`, 400);
      }
      if (!product.b2cAvailable) {
        return jsonError(`Product "${product.name}" is not available for purchase.`, 400);
      }
      const price = product.sellingPrice ? Number(product.sellingPrice.toString()) : 0;
      if (price <= 0) {
        return jsonError(`Price for "${product.name}" is not available.`, 400);
      }
      if (product.stock !== null && product.stock < item.qty) {
        return jsonError(`"${product.name}" is out of stock.`, 400);
      }
      calculatedTotal += price * item.qty;
    }
    orderTotal = Math.round(calculatedTotal * 100) / 100;
  } else {
    // Fall back to client-provided orderTotal if items are not provided.
    const clientTotal = Number(body.orderTotal);
    if (!Number.isFinite(clientTotal) || clientTotal <= 0) {
      return jsonError("Invalid order total.", 400);
    }
    orderTotal = clientTotal;
  }

  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in to apply a coupon.", 401);
  }

  try {
    const result = await validateCoupon(code, user.id, orderTotal!);
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return Response.json({
      ok: true,
      coupon: {
        id: result.coupon.id,
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
      },
      discount: result.discount,
      finalAmount: result.finalAmount,
      orderTotal,
    });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
