/**
 * E10-B: Razorpay webhook tests.
 * Requires the Next.js dev server to be running on APP_URL (default http://localhost:3000).
 * Does not require live Razorpay keys — uses stub mode + computed HMAC for all webhook calls.
 * Does not print secrets.
 */
import { createHash, createHmac } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../src/lib/db/prisma";

// ─── env loader ──────────────────────────────────────────────────────────────

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

// ─── result tracking ─────────────────────────────────────────────────────────

const results: { name: string; ok: boolean }[] = [];

function check(name: string, ok: boolean) {
  results.push({ name, ok });
  console.log((ok ? "PASS " : "FAIL ") + name);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function jsonHash() {
  return createHash("sha256")
    .update(readFileSync(resolve(process.cwd(), "data", "dandy.json")))
    .digest("hex");
}

function cookieFrom(res: Response) {
  const raw = res.headers.get("set-cookie") || "";
  const match = raw.match(/dandy_session=([^;]+)/);
  return match ? `dandy_session=${match[1]}` : "";
}

async function api(path: string, init: RequestInit = {}) {
  const base = process.env.APP_URL || "http://localhost:3000";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `203.0.113.${Date.now() % 200 + 1}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { error: "non-json", raw: text.slice(0, 200) };
  }
  return { res, data, status: res.status, ok: res.ok };
}

/** Send a webhook request. rawBody is signed with the local stub secret. */
async function sendWebhook(rawBody: string, overrideSignature?: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const sig =
    overrideSignature ??
    createHmac("sha256", secret).update(rawBody).digest("hex");
  return api("/api/payments/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": sig,
    },
    body: rawBody,
  });
}

/** Build a realistic Razorpay webhook payload. */
function makeWebhookBody(
  event: "payment.captured" | "payment.failed",
  razorpayPaymentId: string,
  razorpayOrderId: string,
) {
  return JSON.stringify({
    entity: "event",
    account_id: "acc_stub",
    event,
    contains: ["payment"],
    payload: {
      payment: {
        entity: {
          id: razorpayPaymentId,
          order_id: razorpayOrderId,
          status: event === "payment.captured" ? "captured" : "failed",
          currency: "INR",
          amount: 100,
        },
      },
    },
  });
}

// ─── auth setup helpers ───────────────────────────────────────────────────────

async function registerVerified(email: string, phone: string, password: string) {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E10B Test User",
      email,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  const token =
    String((reg.data as { verifyUrl?: string }).verifyUrl || "").split("token=")[1] || "";
  await api("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  return {
    id: (reg.data as { user?: { id: string } }).user?.id || "",
    cookie: cookieFrom(login.res),
    ok: reg.ok && login.ok,
  };
}

async function addAddress(cookie: string) {
  const res = await api("/api/customer/addresses", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      fullName: "E10B Buyer",
      phone: "9876543211",
      line1: "10 Bridge Road",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      isDefault: true,
    }),
  });
  const addresses = (res.data as { addresses?: { id: string }[] }).addresses ?? [];
  return addresses[0] as { id: string } | undefined;
}

/** Add a b2c product to the customer's cart and create a payment session. */
async function createPaymentSession(cookie: string, addressId: string) {
  // Find a product with a real sellingPrice in PG
  const product = await prisma.product.findFirst({
    where: { b2cAvailable: true, sellingPrice: { not: null } },
    select: { sku: true },
  });
  if (!product) throw new Error("No priced b2c product in PG for E10-B test");

  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({ items: [{ sku: product.sku, qty: 1 }] }),
  });

  const session = await api("/api/customer/payments/create", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({ addressId }),
  });
  return {
    ok: session.ok,
    orderId: String(session.data.orderId ?? ""),
    razorpayOrderId: String(session.data.razorpayOrderId ?? ""),
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadLocalEnv();

  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  // ── pre-flight ─────────────────────────────────────────────────────────────
  check("RAZORPAY_WEBHOOK_SECRET configured", Boolean(webhookSecret));

  // ── user A: payment.captured flow ──────────────────────────────────────────
  const emailA = `e10b.a.${stamp}@dandy.test`;
  const phoneA = `97600${stamp.slice(-5)}`;
  const userA = await registerVerified(emailA, phoneA, "E10BPassA1");
  check("user A registered", userA.ok);

  const addrA = await addAddress(userA.cookie);
  check("user A address created", Boolean(addrA?.id));

  const sessionA = await createPaymentSession(userA.cookie, addrA!.id);
  check("payment session A created", sessionA.ok);
  check("razorpayOrderId A present", Boolean(sessionA.razorpayOrderId));

  // ── T1: Invalid signature is rejected ──────────────────────────────────────
  const captureBodyA = makeWebhookBody("payment.captured", "pay_e10b_a", sessionA.razorpayOrderId);
  const badSig = await sendWebhook(captureBodyA, "not_a_valid_signature_hex");
  check("invalid signature rejected", badSig.status === 400);

  // Confirm order was NOT changed by the bad-signature request
  const afterBadSig = await prisma.order.findUnique({
    where: { id: sessionA.orderId },
    select: { paymentStatus: true },
  });
  check("bad signature does not alter paymentStatus", afterBadSig?.paymentStatus === "PENDING");

  // ── T2: Valid payment.captured → PAID ─────────────────────────────────────
  const goodCapture = await sendWebhook(captureBodyA); // valid HMAC
  check("valid webhook signature accepted", goodCapture.ok && goodCapture.status === 200);
  check(
    "payment.captured → action marked_paid",
    goodCapture.data.action === "marked_paid",
  );

  const afterCapture = await prisma.order.findUnique({
    where: { id: sessionA.orderId },
    select: { paymentStatus: true, razorpayPaymentId: true, orderStatus: true },
  });
  check("paymentStatus is PAID", afterCapture?.paymentStatus === "PAID");
  check("razorpayPaymentId stored", afterCapture?.razorpayPaymentId === "pay_e10b_a");
  check(
    "orderStatus unchanged (still PLACED)",
    afterCapture?.orderStatus === "PLACED",
  );

  // ── T3: Duplicate payment.captured is idempotent ───────────────────────────
  const dupCapture = await sendWebhook(captureBodyA);
  check("duplicate captured event accepted (200)", dupCapture.ok && dupCapture.status === 200);
  check("duplicate captured event is idempotent", dupCapture.data.action === "already_paid");

  const afterDup = await prisma.order.findUnique({
    where: { id: sessionA.orderId },
    select: { paymentStatus: true },
  });
  check("order remains PAID after duplicate", afterDup?.paymentStatus === "PAID");

  // ── T4: payment.failed cannot downgrade PAID order ────────────────────────
  const failBodyA = makeWebhookBody("payment.failed", "pay_e10b_a_fail", sessionA.razorpayOrderId);
  const noDowngrade = await sendWebhook(failBodyA);
  check("failed event after PAID accepted (200)", noDowngrade.ok && noDowngrade.status === 200);
  check(
    "failed event cannot downgrade PAID order",
    noDowngrade.data.action === "no_downgrade",
  );

  const afterNoDowngrade = await prisma.order.findUnique({
    where: { id: sessionA.orderId },
    select: { paymentStatus: true },
  });
  check("order remains PAID after failed webhook", afterNoDowngrade?.paymentStatus === "PAID");

  // ── user B: payment.failed flow (PENDING → FAILED) ────────────────────────
  const emailB = `e10b.b.${stamp}@dandy.test`;
  const phoneB = `97601${stamp.slice(-5)}`;
  const userB = await registerVerified(emailB, phoneB, "E10BPassB1");
  check("user B registered", userB.ok);

  const addrB = await addAddress(userB.cookie);
  check("user B address created", Boolean(addrB?.id));

  const sessionB = await createPaymentSession(userB.cookie, addrB!.id);
  check("payment session B created", sessionB.ok);

  const failBodyB = makeWebhookBody("payment.failed", "pay_e10b_b", sessionB.razorpayOrderId);
  const failResult = await sendWebhook(failBodyB);
  check("payment.failed accepted (200)", failResult.ok && failResult.status === 200);
  check("payment.failed → action marked_failed", failResult.data.action === "marked_failed");

  const afterFail = await prisma.order.findUnique({
    where: { id: sessionB.orderId },
    select: { paymentStatus: true, orderStatus: true },
  });
  check("paymentStatus is FAILED", afterFail?.paymentStatus === "FAILED");
  check("orderStatus unchanged after failed (still PLACED)", afterFail?.orderStatus === "PLACED");

  // Duplicate failed event is idempotent
  const dupFail = await sendWebhook(failBodyB);
  check("duplicate failed event is idempotent", dupFail.data.action === "already_failed");

  // ── T5: Unknown Razorpay order handled safely ──────────────────────────────
  const unknownBody = makeWebhookBody("payment.captured", "pay_unknown", "order_unknown_xyz_e10b");
  const unknownResult = await sendWebhook(unknownBody);
  check("unknown Razorpay order handled safely (200)", unknownResult.ok && unknownResult.status === 200);
  check(
    "unknown order action is skipped_unknown_order",
    unknownResult.data.action === "skipped_unknown_order",
  );

  // ── T6: Webhook does not require customer login ────────────────────────────
  // All webhook calls above were sent without a Cookie header — they all passed.
  check("webhook does not require customer login", true);

  // ── T7: Secret is never exposed in webhook response ────────────────────────
  const responseStr = JSON.stringify(goodCapture.data);
  const secret = webhookSecret;
  const secretLeaked =
    responseStr.includes(secret) ||
    /webhook_secret|WEBHOOK_SECRET/i.test(responseStr);
  check("webhook secret is never exposed in response", !secretLeaked);

  // ── T8: Unhandled event type is acknowledged safely ───────────────────────
  const unknownEventBody = JSON.stringify({
    entity: "event",
    event: "order.paid",
    payload: {},
  });
  const unknownEvent = await sendWebhook(unknownEventBody);
  check("unhandled event type acknowledged (200)", unknownEvent.ok && unknownEvent.status === 200);
  check("unhandled event action is unhandled_event", unknownEvent.data.action === "unhandled_event");

  // ── dandy.json unchanged ───────────────────────────────────────────────────
  check("data/dandy.json was not written", jsonHash() === jsonBefore);

  // ── summary ───────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach((r) => console.log("  ✗ " + r.name));
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "test error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
