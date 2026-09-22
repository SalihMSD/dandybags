import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { createShipmentForOrder, getShipmentDetails } from "@/lib/shipping/create-shipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { orderId } = await ctx.params;
  try {
    const shipment = await getShipmentDetails(orderId);
    if (!shipment) return jsonError("No shipment found for this order.", 404);
    return Response.json({ shipment }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { orderId } = await ctx.params;
  try {
    const result = await createShipmentForOrder(orderId);
    if (!result.ok) {
      return jsonError(result.error, result.statusCode);
    }
    return Response.json({
      ok: true,
      shipment: result.shipment,
      action: result.action,
      message: result.message,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return jsonError(message, 500);
  }
}
