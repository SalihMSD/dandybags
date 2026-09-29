import { handleShipmentLookup, defaultLookupDeps } from "@/lib/shiprocket/diagnostic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ shipmentId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { shipmentId } = await ctx.params;
  const result = await handleShipmentLookup(request, shipmentId, defaultLookupDeps);
  return Response.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
