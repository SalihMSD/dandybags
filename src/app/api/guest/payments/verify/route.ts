import { jsonError, originOk } from "@/lib/auth/helpers";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { applyPaymentCapture } from "@/lib/payments/webhook";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const razorpayOrderId = String(body.razorpay_order_id || "").trim();
  const razorpayPaymentId = String(body.razorpay_payment_id || "").trim();
  const razorpaySignature = String(body.razorpay_signature || "").trim();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return jsonError("Payment could not be verified.", 400);
  }

  const order = await prisma.order.findFirst({
    where: { razorpayOrderId },
    select: { id: true, paymentStatus: true },
  });
  if (!order) {
    return jsonError("Order not found.", 404);
  }

  const valid = verifyRazorpaySignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  if (!valid) {
    return jsonError("Invalid payment signature.", 400);
  }

  const result = await applyPaymentCapture({
    razorpayOrderId,
    razorpayPaymentId,
  });

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { paymentStatus: true },
  });

  return Response.json({
    ok: true,
    orderId: order.id,
    paymentStatus: updatedOrder?.paymentStatus || order.paymentStatus,
  });
}
