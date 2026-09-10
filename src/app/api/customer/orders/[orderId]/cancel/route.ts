import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { cancelCustomerOrder } from "@/lib/db/orders";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const limited = rateLimit(clientKey(request, "order-cancel"), 3, 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  const { orderId } = await ctx.params;
  const trimmed = String(orderId || "").trim();
  if (!trimmed) return jsonError("Order not found.", 404);

  const result = await cancelCustomerOrder(user.id, trimmed);
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ ok: true, order: result.order });
}
