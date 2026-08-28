import { jsonError, originOk } from "@/lib/auth/helpers";
import { getVerifiedPhone, isTrackingVerified } from "@/lib/track";
import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  const trackingId = request.headers.get("x-tracking-id") || "";
  if (!trackingId || !isTrackingVerified(trackingId)) {
    return jsonError("Please verify your phone first.", 401);
  }

  const phone = getVerifiedPhone(trackingId);
  if (!phone) {
    return jsonError("Session expired. Please verify again.", 401);
  }

  const { orderId } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { sku: "asc" } } },
  });

  if (!order || order.shipPhone !== phone) {
    return jsonError("Order not found.", 404);
  }

  return Response.json({ order: publicOrder(order) });
}
