import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { reconcileShipmentForOrder } from "@/lib/shipping/create-shipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { orderId } = await ctx.params;

  try {
    const result = await reconcileShipmentForOrder(orderId);

    if (result.ok) {
      if (result.action === "reconciled") {
        return Response.json(
          {
            ok: true,
            action: "reconciled",
            message: result.message,
            shipment: result.shipment,
          },
          {
            headers: { "Cache-Control": "no-store, max-age=0" },
          },
        );
      }
      return Response.json(
        {
          ok: true,
          action: "no_remote_order",
          message: result.message,
        },
        {
          headers: { "Cache-Control": "no-store, max-age=0" },
        },
      );
    }

    return jsonError(result.error, result.statusCode);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return jsonError(message, 500);
  }
}
