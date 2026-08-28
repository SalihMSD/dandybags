import { jsonError, originOk } from "@/lib/auth/helpers";
import { createCustomerPaymentOrder, createGuestPaymentOrder } from "@/lib/payments/create-order";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const addressId = String(body.addressId || "");
  const guestDetails = body.guestDetails as Record<string, unknown> | undefined;
  const items = body.items as unknown;
  const couponCode = String(body.couponCode || "").trim() || undefined;

  if (guestDetails) {
    const result = await createGuestPaymentOrder(guestDetails, items, couponCode);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({
      ok: true,
      keyId: result.session.keyId,
      razorpayOrderId: result.session.razorpayOrderId,
      amount: result.session.amount,
      currency: result.session.currency,
      orderId: result.session.orderId,
    });
  }

  let user: Awaited<ReturnType<typeof import("@/lib/auth/session").requireCustomer>>;
  try {
    const { requireCustomer } = await import("@/lib/auth/session");
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const result = await createCustomerPaymentOrder(user.id, addressId, couponCode);
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({
    ok: true,
    keyId: result.session.keyId,
    razorpayOrderId: result.session.razorpayOrderId,
    amount: result.session.amount,
    currency: result.session.currency,
    orderId: result.session.orderId,
  });
}
