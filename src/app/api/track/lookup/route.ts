import { jsonError, originOk } from "@/lib/auth/helpers";
import { normalizePhone } from "@/lib/auth/validate";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  const limited = rateLimit(clientKey(request, "track-lookup"), 3, 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const rawOrderId = String(body.orderId || "").trim();
  const rawPhone = String(body.phone || "").trim();

  if (!rawOrderId || !rawPhone) {
    return jsonError("Order ID and phone number are required.", 400);
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return jsonError("Please enter a valid phone number.", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: rawOrderId },
    include: { items: { orderBy: { sku: "asc" as const } } },
  });

  if (!order || order.shipPhone !== phone) {
    return jsonError("Order not found.", 404);
  }

  return Response.json({ order: publicOrder(order) });
}
