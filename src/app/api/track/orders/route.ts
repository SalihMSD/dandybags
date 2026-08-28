import { jsonError, originOk } from "@/lib/auth/helpers";
import { getVerifiedPhone, isTrackingVerified } from "@/lib/track";
import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  const trackingId = request.headers.get("x-tracking-id") || "";
  if (!trackingId || !isTrackingVerified(trackingId)) {
    return jsonError("Please verify your phone first.", 401);
  }

  const phone = getVerifiedPhone(trackingId);
  if (!phone) {
    return jsonError("Session expired. Please verify again.", 401);
  }

  const orders = await prisma.order.findMany({
    where: { shipPhone: phone },
    include: { items: { orderBy: { sku: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ orders: orders.map(publicOrder) });
}
