import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { readStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requireCustomer();
    const { orderId } = await ctx.params;
    const order = readStore().orders.find((o) => o.id === orderId);
    if (!order || order.userId !== user.id) return jsonError("Order not found.", 404);
    return Response.json({ order });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
