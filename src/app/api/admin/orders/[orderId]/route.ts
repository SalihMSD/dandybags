import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOrder, updateAdminOrder } from "@/lib/db/admin-orders";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { orderId } = await ctx.params;
  try {
    const order = await getAdminOrder(orderId);
    if (!order) return jsonError("Order not found.", 404);
    return Response.json({ order });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { orderId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }
  try {
    const result = await updateAdminOrder(orderId, body);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true, order: result.order });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
