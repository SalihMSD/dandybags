import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { getCustomerReturnByOrderId } from "@/lib/db/returns";
import { requestReturn, cancelReturnRequest, isReturnResolution } from "@/lib/payments/return";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const { orderId } = await ctx.params;
  const trimmed = String(orderId || "").trim();
  if (!trimmed) return jsonError("Order not found.", 404);

  const returnRequest = await getCustomerReturnByOrderId(user.id, trimmed);
  if (!returnRequest) {
    return Response.json({ returnRequest: null });
  }
  return Response.json({ returnRequest });
}

export async function POST(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const limited = rateLimit(clientKey(request, "return-request"), 10, 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  const { orderId } = await ctx.params;
  const trimmed = String(orderId || "").trim();
  if (!trimmed) return jsonError("Order not found.", 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const resolution = String(body.resolution || "").trim();
  if (!isReturnResolution(resolution)) {
    return jsonError("Invalid resolution type. Must be REFUND, REPLACE, or EXCHANGE.", 400);
  }

  const reason = String(body.reason || "").trim();
  if (!reason) {
    return jsonError("Please provide a reason for the return.", 400);
  }

  const note = body.note ? String(body.note).trim().slice(0, 500) : undefined;
  const exchangeVariantSku = body.exchangeVariantSku
    ? String(body.exchangeVariantSku).trim()
    : null;

  const itemsRaw = body.items;
  if (!Array.isArray(itemsRaw)) {
    return jsonError("Please specify items to return.", 400);
  }

  type RawItem = Record<string, unknown>;
  const items: { sku: string; qty: number; condition?: string | null; reason?: string | null }[] = [];
  for (const raw of itemsRaw as RawItem[]) {
    const sku = String(raw.sku || "").trim();
    const qty = Number(raw.qty);
    if (!sku || !Number.isInteger(qty) || qty <= 0) {
      return jsonError("Each return item must have a valid SKU and quantity.", 400);
    }
    items.push({
      sku,
      qty,
      condition: raw.condition ? String(raw.condition) : null,
      reason: raw.reason ? String(raw.reason) : null,
    });
  }

  const result = await requestReturn(user.id, trimmed, {
    resolution: resolution as "REFUND" | "REPLACE" | "EXCHANGE",
    reason,
    note,
    exchangeVariantSku: resolution === "EXCHANGE" || resolution === "REPLACE" ? exchangeVariantSku : null,
    items,
  });

  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ ok: true, returnRequest: result.returnRequest }, { status: 201 });
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const { orderId } = await ctx.params;
  const trimmed = String(orderId || "").trim();
  if (!trimmed) return jsonError("Order not found.", 404);

  const returnRequest = await getCustomerReturnByOrderId(user.id, trimmed);
  if (!returnRequest) return jsonError("No return request found for this order.", 404);

  const result = await cancelReturnRequest(user.id, returnRequest.id);
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ ok: true });
}
