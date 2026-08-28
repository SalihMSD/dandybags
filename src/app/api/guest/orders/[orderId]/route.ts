import { jsonError, originOk } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const phone = String(body.phone || "").trim();
  if (!phone) {
    return jsonError("Phone number is required.", 400);
  }

  const { orderId } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { sku: "asc" } } },
  });

  if (!order || order.shipPhone !== phone) {
    return jsonError("Order not found or phone does not match.", 404);
  }

  return Response.json({ order: publicOrder(order) });
}
