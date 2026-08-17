import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { verifyCustomerPayment } from "@/lib/payments/verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const result = await verifyCustomerPayment(user.id, body);
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({
    ok: true,
    orderId: result.orderId,
    paymentStatus: result.paymentStatus,
  });
}
