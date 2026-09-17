import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerOrder } from "@/lib/db/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requireCustomer();
    const { orderId } = await ctx.params;
    const order = await getCustomerOrder(user.id, orderId);
    if (!order) return jsonError("Order not found.", 404);
    return Response.json({ order }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
