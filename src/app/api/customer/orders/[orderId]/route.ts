import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerOrder } from "@/lib/db/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  try {
    const { orderId } = await ctx.params;
    const order = await getCustomerOrder(user.id, orderId);
    if (!order) return jsonError("Order not found.", 404);
    return Response.json({ order }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[DANDY api] failed to load customer order", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError("Unable to load order at this time. Please try again later.", 500);
  }
}
