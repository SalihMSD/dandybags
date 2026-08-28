/**
 * Razorpay webhook processing — server-only.
 *
 * Webhook signature uses RAZORPAY_WEBHOOK_SECRET (different from RAZORPAY_KEY_SECRET).
 * Razorpay computes: HMAC-SHA256(rawBody, webhookSecret) → X-Razorpay-Signature header.
 *
 * Events handled:
 *   payment.captured → paymentStatus = PAID  (idempotent; never downgrades)
 *                      stock deducted atomically inside the same transaction
 *   payment.failed   → paymentStatus = FAILED (idempotent; never downgrades a PAID order)
 *                      no stock change — stock was never deducted before capture
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

    // Quick pre-check outside transaction: skip unknown orders without acquiring a lock.
    const exists = await prisma.order.findFirst({
      where: { razorpayOrderId },
      select: { id: true },
    });
    if (!exists) {
      return { ok: true, action: "skipped_unknown_order" };
    }

    // Everything below runs inside a single serializable transaction.
    //
    // Concurrency guarantees:
    //   1. pg_advisory_xact_lock serializes concurrent webhook deliveries for
    //      the same Razorpay order (lock released automatically on commit/rollback).
    //   2. paymentStatus is re-read INSIDE the transaction so a duplicate
    //      delivery that arrives while the first is committing sees PAID and exits.
    //   3. Product stock is decremented with a conditional WHERE stock >= qty;
    //      this is an atomic DB operation that prevents overselling even when
    //      two different orders race to buy the last unit of the same SKU.
    //   4. The order update is guarded with paymentStatus: { not: "PAID" } as a
    //      final safety net against a double-write slipping through.
    try {
      const action = await prisma.$transaction(async (tx) => {
        // Serialize concurrent delivery for this specific Razorpay order.
        // Uses a transaction-level advisory lock (auto-released on commit/rollback).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${razorpayOrderId}))`;

        // Re-read order WITH items inside the locked transaction.
        const order = await tx.order.findFirst({
          where: { razorpayOrderId },
          include: { items: { select: { sku: true, qty: true } }, coupon: { select: { id: true } } },
        });

        if (!order) return "skipped_unknown_order";

        // Idempotency guard INSIDE the transaction (correct under concurrency).
        if (order.paymentStatus === "PAID") return "already_paid";

        // Atomically deduct numeric stock for each order item.
        // Null stock = unlimited → skip deduction, allow purchase freely.
        for (const item of order.items) {
          // WHERE stock >= qty ensures the decrement only fires if stock is
          // numeric AND sufficient. It will NOT match NULL stock columns.
          const result = await tx.product.updateMany({
            where: { sku: item.sku, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });

          if (result.count === 0) {
            // 0 rows updated: either stock is null (unlimited) or insufficient.
            // Distinguish by reading the current stock value.
            const prod = await tx.product.findUnique({
              where: { sku: item.sku },
              select: { stock: true },
            });
            if (prod !== null && prod.stock !== null) {
              // Numeric stock exists but is insufficient — prevent oversell.
              // Throws → transaction rolls back → no partial deductions.
              throw new Error(`INSUFFICIENT_STOCK:${item.sku}`);
            }
            // prod.stock === null → unlimited, nothing to deduct — continue.
          }
        }

        // Update order to PAID. The WHERE guard prevents a double-write if two
        // transactions somehow race past the re-read above.
        const updated = await tx.order.updateMany({
          where: { id: order.id, paymentStatus: { not: "PAID" } },
          data: {
            paymentStatus: "PAID",
            ...(razorpayPaymentId && !order.razorpayPaymentId
              ? { razorpayPaymentId }
              : {}),
          },
        });

        if (updated.count > 0 && order.couponId) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: {
              usedCount: { increment: 1 },
              usedAt: new Date(),
              status: "USED",
            },
          });
        }

        return updated.count > 0 ? "marked_paid" : "already_paid";
      });

      return { ok: true, action };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:")) {
        // Oversell scenario: Razorpay captured money but stock ran out concurrently.
        // Ack with 200 so Razorpay stops retrying. Order stays PENDING — admin must
        // investigate and issue a refund through the Razorpay dashboard.
        return { ok: true, action: "insufficient_stock" };
      }
      throw err; // DB errors propagate → route returns 500 → Razorpay will retry.
    }
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
