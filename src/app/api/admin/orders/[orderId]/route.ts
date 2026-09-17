import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOrder, updateAdminOrder, cancelAdminOrder } from "@/lib/db/admin-orders";
import { retryFailedRefund, getRefundState } from "@/lib/payments/refund";

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
    const order = await getAdminOrder(orderId);
    if (!order) return jsonError("Order not found.", 404);
    return Response.json({ order }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { orderId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }
  try {
    const result = await updateAdminOrder(orderId, body);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true, order: result.order });
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
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // no body for cancel
  }

  const action = String(body.action || "").trim();

  if (action === "cancel") {
    const result = await cancelAdminOrder(orderId);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true, order: result.order, refundStatus: result.refundStatus, refundError: result.refundError });
  }

  if (action === "retry_refund") {
    const refundState = await getRefundState(orderId);
    if (refundState === "SUCCESS") {
      return Response.json({ ok: true, message: "Refund already completed." });
    }
    if (refundState === "PROCESSING") {
      return Response.json({ ok: true, message: "Refund is already being processed.", refundStatus: "PROCESSING" });
    }
    if (!refundState) {
      return jsonError("No refund record found.", 404);
    }
    const result = await retryFailedRefund(orderId);
    if (result.ok) {
      return Response.json({ ok: true, refundStatus: result.status, refundId: result.refundId });
    }
    return jsonError(result.error, result.status);
  }

  return jsonError("Invalid action.", 400);
}
