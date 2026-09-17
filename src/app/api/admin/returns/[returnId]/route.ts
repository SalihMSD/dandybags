import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { processApprovedReturn, approveReturnRequest, rejectReturnRequest } from "@/lib/payments/return";
import { type PublicReturnRequest } from "@/lib/db/returns";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ returnId: string }> };

const returnInclude = {
  items: { select: { sku: true, qty: true, condition: true, reason: true } },
  order: {
    select: {
      id: true,
      userId: true,
      totalLabel: true,
      paymentStatus: true,
      orderStatus: true,
      razorpayPaymentId: true,
    },
  },
  refund: {
    select: {
      id: true,
      status: true,
      amount: true,
      razorpayRefundId: true,
      failureReason: true,
    },
  },
};

function serialize(rr: {
  id: string;
  orderId: string;
  status: string;
  resolution: string;
  reason: string;
  note: string | null;
  refundAmount: number | null;
  exchangeVariantSku: string | null;
  adminNote: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: { sku: string; qty: number; condition: string | null; reason: string | null }[];
  order: { id: string; userId: string; totalLabel: string; paymentStatus: string; orderStatus: string; razorpayPaymentId: string | null };
  refund: { id: string; status: string; amount: number; razorpayRefundId: string | null; failureReason: string | null } | null;
}): PublicReturnRequest {
  return {
    id: rr.id,
    orderId: rr.orderId,
    status: rr.status as ReturnStatus,
    resolution: rr.resolution as ReturnResolution,
    reason: rr.reason,
    note: rr.note,
    refundAmount: rr.refundAmount,
    exchangeVariantSku: rr.exchangeVariantSku,
    adminNote: rr.adminNote,
    processedAt: rr.processedAt ? rr.processedAt.toISOString() : null,
    createdAt: rr.createdAt.toISOString(),
    updatedAt: rr.updatedAt.toISOString(),
    items: rr.items.map((i) => ({ sku: i.sku, qty: i.qty, condition: i.condition, reason: i.reason })),
    refund: rr.refund
      ? {
          id: rr.refund.id,
          status: rr.refund.status,
          amount: rr.refund.amount,
          razorpayRefundId: rr.refund.razorpayRefundId,
          failureReason: rr.refund.failureReason,
        }
      : null,
  } as unknown as PublicReturnRequest;
}

type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
type ReturnResolution = "REFUND" | "REPLACE" | "EXCHANGE";

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { returnId } = await ctx.params;
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: returnInclude,
  });

  if (!returnRequest) return jsonError("Return request not found.", 404);
  return Response.json({ returnRequest: serialize(returnRequest) });
}

export async function POST(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { returnId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const action = String(body.action || "").trim();

  if (action === "approve") {
    const result = await approveReturnRequest(returnId, {
      adminNote: body.adminNote ? String(body.adminNote).trim().slice(0, 500) : undefined,
    });
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true, returnRequest: result.returnRequest });
  }

  if (action === "process") {
    const result = await processApprovedReturn(returnId);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true, returnRequest: result.returnRequest });
  }

  if (action === "reject") {
    const adminNote = body.adminNote ? String(body.adminNote).trim() : "";
    if (!adminNote) return jsonError("Please provide a reason for rejection.", 400);
    const result = await rejectReturnRequest(returnId, { adminNote });
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true, returnRequest: result.returnRequest });
  }

  return jsonError("Invalid action.", 400);
}
