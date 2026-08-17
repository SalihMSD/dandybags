/**
 * Razorpay webhook processing — server-only.
 *
 * Webhook signature uses RAZORPAY_WEBHOOK_SECRET (different from RAZORPAY_KEY_SECRET).
 * Razorpay computes: HMAC-SHA256(rawBody, webhookSecret) → X-Razorpay-Signature header.
 *
 * Events handled:
 *   payment.captured → paymentStatus = PAID  (idempotent; never downgrades)
 *   payment.failed   → paymentStatus = FAILED (idempotent; never downgrades a PAID order)
 *   all others       → acknowledged, not processed
 */
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db/prisma";

function webhookSecret() {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
}

/**
 * Verify a Razorpay webhook signature.
 * rawBody must be the unmodified request body string (not JSON-parsed).
 * Returns false if the secret is not configured or the signature does not match.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = webhookSecret();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Shape of the payment entity nested in a Razorpay webhook payload. */
type RazorpayPaymentEntity = {
  id?: string;        // pay_xxx
  order_id?: string;  // order_xxx
  status?: string;    // captured | failed
};

function extractPayment(payload: unknown): RazorpayPaymentEntity | null {
  if (!payload || typeof payload !== "object") return null;
  const evt = payload as Record<string, unknown>;
  const inner = evt.payload as Record<string, unknown> | undefined;
  if (!inner) return null;
  const paymentWrapper = inner.payment as Record<string, unknown> | undefined;
  if (!paymentWrapper) return null;
  return (paymentWrapper.entity ?? null) as RazorpayPaymentEntity | null;
}

export type WebhookResult = { ok: true; action: string } | { ok: false; error: string };

/**
 * Process a verified Razorpay webhook event.
 * MUST only be called after verifyWebhookSignature passes.
 *
 * Idempotency rules:
 *   - payment.captured on an already-PAID order → no-op ("already_paid")
 *   - payment.failed on a PAID order → no-op, do not downgrade ("no_downgrade")
 *   - payment.failed on an already-FAILED order → no-op ("already_failed")
 *   - Unknown razorpayOrderId → ack safely ("skipped_unknown_order")
 */
export async function processWebhookEvent(payload: unknown): Promise<WebhookResult> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid payload." };
  }

  const eventType = String((payload as Record<string, unknown>).event || "").trim();
  const payment = extractPayment(payload);
  const razorpayOrderId = String(payment?.order_id || "").trim();
  const razorpayPaymentId = String(payment?.id || "").trim();

  if (eventType === "payment.captured") {
    if (!razorpayOrderId) {
      return { ok: true, action: "skipped_no_order_id" };
    }
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId },
      select: { id: true, paymentStatus: true, razorpayPaymentId: true },
    });
    if (!order) {
      return { ok: true, action: "skipped_unknown_order" };
    }
    // Idempotency: already PAID → no-op
    if (order.paymentStatus === "PAID") {
      return { ok: true, action: "already_paid" };
    }
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        // Only set paymentId if not already stored and we have one
        ...(razorpayPaymentId && !order.razorpayPaymentId
          ? { razorpayPaymentId }
          : {}),
      },
    });
    return { ok: true, action: "marked_paid" };
  }

  if (eventType === "payment.failed") {
    if (!razorpayOrderId) {
      return { ok: true, action: "skipped_no_order_id" };
    }
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId },
      select: { id: true, paymentStatus: true },
    });
    if (!order) {
      return { ok: true, action: "skipped_unknown_order" };
    }
    // Never downgrade a successfully paid order
    if (order.paymentStatus === "PAID") {
      return { ok: true, action: "no_downgrade" };
    }
    // Idempotency: already FAILED → no-op
    if (order.paymentStatus === "FAILED") {
      return { ok: true, action: "already_failed" };
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });
    return { ok: true, action: "marked_failed" };
  }

  // Unhandled event type — acknowledge without processing
  return { ok: true, action: `unhandled_event` };
}
