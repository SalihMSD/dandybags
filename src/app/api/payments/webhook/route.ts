import { jsonError } from "@/lib/auth/helpers";
import { processWebhookEvent, verifyWebhookSignature } from "@/lib/payments/webhook";

export const runtime = "nodejs";

/**
 * POST /api/payments/webhook
 *
 * Server-to-server endpoint — no customer session required.
 * Razorpay delivers signed events here after a payment succeeds or fails.
 *
 * Security:
 *   1. Read raw body bytes (before any JSON parse) — required for HMAC verification.
 *   2. Verify X-Razorpay-Signature with RAZORPAY_WEBHOOK_SECRET.
 *   3. Only then parse and process the payload.
 *   4. Return 400 on signature failure (prevents untrusted retries).
 *   5. Return 200 for all verified events, including unknown/unhandled ones
 *      (prevents Razorpay from retrying events we deliberately skip).
 *   6. Return 500 only on unexpected errors so Razorpay retries transient failures.
 */
export async function POST(request: Request) {
  // Read raw body as text — must happen before any JSON parsing
  const rawBody = await request.text();
  const signature = (request.headers.get("x-razorpay-signature") ?? "").trim();

  // Reject unsigned or tampered requests immediately
  if (!verifyWebhookSignature(rawBody, signature)) {
    return jsonError("Invalid signature.", 400);
  }

  // Parse only after signature is confirmed
  let payload: unknown;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as unknown) : null;
  } catch {
    return jsonError("Invalid payload.", 400);
  }

  try {
    const result = await processWebhookEvent(payload);
    // Always 200 after a verified event — prevents infinite Razorpay retries
    return Response.json({ ok: true, action: result.ok ? result.action : "error" });
  } catch {
    // Transient error (e.g. DB unavailable) — let Razorpay retry
    return Response.json({ error: "Processing failed." }, { status: 500 });
  }
}
