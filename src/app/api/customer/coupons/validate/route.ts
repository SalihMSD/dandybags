import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { validateCoupon } from "@/lib/db/coupons";

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
  const orderTotal = Number(body.orderTotal);

  if (!code) {
    return jsonError("Coupon code is required.", 400);
  }

  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return jsonError("Invalid order total.", 400);
  }

  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in to apply a coupon.", 401);
  }

  try {
    const result = await validateCoupon(code, user.id, orderTotal);
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return Response.json({
      ok: true,
      coupon: result.coupon,
      discount: result.discount,
      finalAmount: result.finalAmount,
    });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
