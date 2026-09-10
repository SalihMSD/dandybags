import { prisma } from "@/lib/db/prisma";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { applyPaymentCapture } from "@/lib/payments/webhook";

export async function verifyCustomerPayment(
  userId: string,
  input: {
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
  },
) {
  const razorpayOrderId = String(input.razorpay_order_id || "").trim();
  const razorpayPaymentId = String(input.razorpay_payment_id || "").trim();
  const razorpaySignature = String(input.razorpay_signature || "").trim();
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return { ok: false as const, error: "Payment could not be verified.", status: 400 as const };
  }

  const order = await prisma.order.findFirst({
    where: { razorpayOrderId, userId },
    select: { id: true },
  });
  if (!order) {
    return { ok: false as const, error: "Payment could not be verified.", status: 400 as const };
  }

  const valid = verifyRazorpaySignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  if (!valid) {
    return { ok: false as const, error: "Payment could not be verified.", status: 400 as const };
  }

  const result = await applyPaymentCapture({
    razorpayOrderId,
    razorpayPaymentId,
  });

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { paymentStatus: true },
  });

  return {
    ok: true as const,
    orderId: order.id,
    paymentStatus: updatedOrder?.paymentStatus || "PENDING",
  };
}
