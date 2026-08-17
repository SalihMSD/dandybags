import { prisma } from "@/lib/db/prisma";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";

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

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayPaymentId },
  });

  return {
    ok: true as const,
    orderId: order.id,
    paymentStatus: order.paymentStatus,
  };
}
