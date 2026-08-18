/**
 * E11: Inventory & order safety tests.
 * Requires the Next.js dev server running on APP_URL (default http://localhost:3000).
 *
 * Stock setup: all 35 products currently have stock = null.
 * Tests that need numeric stock temporarily set a value on one product via
 * direct Prisma write, and restore it in a finally block.
 * This does NOT invent permanent stock values.
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

async function sendWebhook(rawBody: string, overrideSignature?: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const sig =
    overrideSignature ??
    createHmac("sha256", secret).update(rawBody).digest("hex");
  return api("/api/payments/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
    body: rawBody,
  });
}

function makeWebhookBody(
  event: "payment.captured" | "payment.failed",
  razorpayPaymentId: string,
  razorpayOrderId: string,
) {
  return JSON.stringify({
    entity: "event",
    event,
    contains: ["payment"],
    payload: {
      payment: {
        entity: {
          id: razorpayPaymentId,
          order_id: razorpayOrderId,
          status: event === "payment.captured" ? "captured" : "failed",
          currency: "INR",
        },
      },
    },
  });
}

// ─── auth helpers ─────────────────────────────────────────────────────────────

async function registerVerified(email: string, phone: string, password: string) {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E11 Test User",
      email,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  const token =
    String((reg.data as { verifyUrl?: string }).verifyUrl || "").split("token=")[1] || "";
  await api("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  return { cookie: cookieFrom(login.res), ok: reg.ok && login.ok };
}

async function addAddress(cookie: string) {
  const res = await api("/api/customer/addresses", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      fullName: "E11 Buyer",
      phone: "9876543210",
      line1: "5 Test Lane",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      isDefault: true,
    }),
  });
  const addresses = (res.data as { addresses?: { id: string }[] }).addresses ?? [];
  return addresses[0] as { id: string } | undefined;
}

async function createPaymentSession(cookie: string, addressId: string, sku: string) {
  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({ items: [{ sku, qty: 1 }] }),
  });
  return api("/api/customer/payments/create", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({ addressId }),
  });
}

async function adminLogin() {
  const email = process.env.ADMIN_EMAIL || "";
  const password = process.env.ADMIN_PASSWORD || "";
  const res = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return cookieFrom(res.res);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadLocalEnv();

  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);

  // Find a product suitable for all E11 tests (b2c, has sellingPrice)
  const testProduct = await prisma.product.findFirst({
    where: { b2cAvailable: true, sellingPrice: { not: null } },
    select: { sku: true, name: true, stock: true },
  });
  if (!testProduct) throw new Error("No priced b2c product found for E11 tests");
  const { sku: testSku } = testProduct;

  // ── T1: Null stock → checkout allowed (current behavior unchanged) ───────
  {
    // Ensure stock is null (it should be already)
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
    const u = await registerVerified(
      `e11.null.${stamp}@dandy.test`,
      `97700${stamp.slice(-5)}`,
      "E11Pass1",
    );
    const addr = await addAddress(u.cookie);
    const session = await createPaymentSession(u.cookie, addr!.id, testSku);
    check("null stock: checkout allowed", session.ok);
    check("null stock: payment session returned", Boolean(session.data.razorpayOrderId));

    // Webhook captured → stock remains null (no deduction for null stock)
    if (session.ok) {
      const body = makeWebhookBody(
        "payment.captured",
        "pay_e11_null",
        String(session.data.razorpayOrderId),
      );
      const wh = await sendWebhook(body);
      check("null stock: captured webhook succeeds", wh.ok && wh.status === 200);
      check(
        "null stock: action is marked_paid",
        wh.data.action === "marked_paid",
      );

      // Stock should still be null (not deducted)
      const afterProd = await prisma.product.findUnique({
        where: { sku: testSku },
        select: { stock: true },
      });
      check("null stock: stock remains null after capture", afterProd?.stock === null);

      // Order PAID, orderStatus PLACED
      const afterOrder = await prisma.order.findFirst({
        where: { razorpayOrderId: String(session.data.razorpayOrderId) },
        select: { paymentStatus: true, orderStatus: true },
      });
      check("null stock: paymentStatus PAID", afterOrder?.paymentStatus === "PAID");
      check("null stock: orderStatus unchanged PLACED", afterOrder?.orderStatus === "PLACED");
    }
  }

  // ── T2: Sufficient numeric stock → checkout and capture succeed ────────────
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });

    const u = await registerVerified(
      `e11.suf.${stamp}@dandy.test`,
      `97701${stamp.slice(-5)}`,
      "E11Pass2",
    );
    const addr = await addAddress(u.cookie);
    const session = await createPaymentSession(u.cookie, addr!.id, testSku);
    check("sufficient stock: checkout allowed", session.ok);

    if (session.ok) {
      const body = makeWebhookBody(
        "payment.captured",
        "pay_e11_suf",
        String(session.data.razorpayOrderId),
      );
      const wh = await sendWebhook(body);
      check("sufficient stock: capture webhook succeeds", wh.ok);
      check("sufficient stock: action is marked_paid", wh.data.action === "marked_paid");

      // Stock should be decremented by 1 (qty=1)
      const afterProd = await prisma.product.findUnique({
        where: { sku: testSku },
        select: { stock: true },
      });
      check("sufficient stock: stock decremented by qty", afterProd?.stock === 4);

      // Duplicate webhook is idempotent and does NOT deduct again
      const dup = await sendWebhook(body);
      check("sufficient stock: duplicate capture is idempotent", dup.data.action === "already_paid");

      const afterDup = await prisma.product.findUnique({
        where: { sku: testSku },
        select: { stock: true },
      });
      check("sufficient stock: duplicate does not double-deduct", afterDup?.stock === 4);
    }
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // ── T3: Insufficient stock at checkout → rejected (pre-payment guard) ──────
  try {
    // Set stock to 0 so checkout fails before opening Razorpay
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 0 } });

    const u = await registerVerified(
      `e11.ins.${stamp}@dandy.test`,
      `97702${stamp.slice(-5)}`,
      "E11Pass3",
    );
    const addr = await addAddress(u.cookie);
    const session = await createPaymentSession(u.cookie, addr!.id, testSku);
    check("insufficient stock: checkout rejected", !session.ok && session.status === 400);
    check(
      "insufficient stock: error mentions out of stock",
      String(session.data.error || "").toLowerCase().includes("stock"),
    );

    // Also test qty=1 against stock=0 specifically
    const prodAfter = await prisma.product.findUnique({
      where: { sku: testSku },
      select: { stock: true },
    });
    check("insufficient stock: stock unchanged after rejected checkout", prodAfter?.stock === 0);
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // ── T4: payment.failed → paymentStatus FAILED, stock NOT deducted ──────────
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 3 } });

    const u = await registerVerified(
      `e11.fail.${stamp}@dandy.test`,
      `97703${stamp.slice(-5)}`,
      "E11Pass4",
    );
    const addr = await addAddress(u.cookie);
    const session = await createPaymentSession(u.cookie, addr!.id, testSku);
    check("failed payment: session created", session.ok);

    if (session.ok) {
      const body = makeWebhookBody(
        "payment.failed",
        "pay_e11_fail",
        String(session.data.razorpayOrderId),
      );
      const wh = await sendWebhook(body);
      check("failed payment: webhook succeeds (200)", wh.ok);
      check("failed payment: action is marked_failed", wh.data.action === "marked_failed");

      // Stock must NOT be deducted — payment failed, nothing was captured
      const afterProd = await prisma.product.findUnique({
        where: { sku: testSku },
        select: { stock: true },
      });
      check("failed payment: stock unchanged (no deduction)", afterProd?.stock === 3);

      const afterOrder = await prisma.order.findFirst({
        where: { razorpayOrderId: String(session.data.razorpayOrderId) },
        select: { paymentStatus: true, orderStatus: true },
      });
      check("failed payment: paymentStatus FAILED", afterOrder?.paymentStatus === "FAILED");
      check("failed payment: orderStatus unchanged PLACED", afterOrder?.orderStatus === "PLACED");
    }
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // ── T5: Cancellation of PAID order → stock restored transactionally ────────
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 2 } });

    const u = await registerVerified(
      `e11.can.${stamp}@dandy.test`,
      `97704${stamp.slice(-5)}`,
      "E11Pass5",
    );
    const addr = await addAddress(u.cookie);
    const session = await createPaymentSession(u.cookie, addr!.id, testSku);
    check("cancel PAID: session created", session.ok);

    if (session.ok) {
      // Capture payment (deducts stock: 2→1)
      const captureBody = makeWebhookBody(
        "payment.captured",
        "pay_e11_can",
        String(session.data.razorpayOrderId),
      );
      const wh = await sendWebhook(captureBody);
      check("cancel PAID: capture succeeded", wh.data.action === "marked_paid");

      const afterCapture = await prisma.product.findUnique({
        where: { sku: testSku },
        select: { stock: true },
      });
      check("cancel PAID: stock deducted (2→1)", afterCapture?.stock === 1);

      // Admin cancels the PAID order → stock should be restored (1→2)
      const adminCookie = await adminLogin();
      const orderId = String(session.data.orderId);
      const cancel = await api(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { Cookie: adminCookie },
        body: JSON.stringify({ orderStatus: "CANCELLED" }),
      });
      check("cancel PAID: admin cancel accepted", cancel.ok);

      const afterCancel = await prisma.product.findUnique({
        where: { sku: testSku },
        select: { stock: true },
      });
      check("cancel PAID: stock restored (1→2)", afterCancel?.stock === 2);

      const afterOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderStatus: true, paymentStatus: true },
      });
      check("cancel PAID: orderStatus is CANCELLED", afterOrder?.orderStatus === "CANCELLED");
      check("cancel PAID: paymentStatus remains PAID", afterOrder?.paymentStatus === "PAID");
    }
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // ── T6: Cancellation of PENDING order → no stock restoration ──────────────
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });

    const u = await registerVerified(
      `e11.pcan.${stamp}@dandy.test`,
      `97705${stamp.slice(-5)}`,
      "E11Pass6",
    );
    const addr = await addAddress(u.cookie);
    const session = await createPaymentSession(u.cookie, addr!.id, testSku);
    check("cancel PENDING: session created", session.ok);

    if (session.ok) {
      // No capture webhook → order remains PENDING
      // Admin cancels PENDING order → no stock restoration (stock was never deducted)
      const adminCookie = await adminLogin();
      const orderId = String(session.data.orderId);
      const cancel = await api(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { Cookie: adminCookie },
        body: JSON.stringify({ orderStatus: "CANCELLED" }),
      });
      check("cancel PENDING: admin cancel accepted", cancel.ok);

      const afterCancel = await prisma.product.findUnique({
        where: { sku: testSku },
        select: { stock: true },
      });
      // Stock stays at 5 (was never deducted for a PENDING order)
      check("cancel PENDING: stock unchanged", afterCancel?.stock === 5);
    }
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // ── T7: Concurrent oversell protection ───────────────────────────────────
  // Two users each place an order for the same SKU when stock = 1.
  // Both get payment sessions. Both captured webhooks fire simultaneously.
  // Exactly one must succeed; the other must get "insufficient_stock".
  // Stock must not go below 0.
  {
    const concurrentPassed = await (async () => {
      try {
        await prisma.product.update({ where: { sku: testSku }, data: { stock: 1 } });

        // User C1
        const uc1 = await registerVerified(
          `e11.c1.${stamp}@dandy.test`,
          `97706${stamp.slice(-5)}`,
          "E11Pass7",
        );
        const addrC1 = await addAddress(uc1.cookie);
        const sessionC1 = await createPaymentSession(uc1.cookie, addrC1!.id, testSku);
        if (!sessionC1.ok) return false;

        // Stock is still 1 (not yet deducted — deduction happens at webhook)
        // User C2
        const uc2 = await registerVerified(
          `e11.c2.${stamp}@dandy.test`,
          `97707${stamp.slice(-5)}`,
          "E11Pass8",
        );
        const addrC2 = await addAddress(uc2.cookie);
        const sessionC2 = await createPaymentSession(uc2.cookie, addrC2!.id, testSku);
        if (!sessionC2.ok) return false;

        const bodyC1 = makeWebhookBody(
          "payment.captured",
          "pay_e11_c1",
          String(sessionC1.data.razorpayOrderId),
        );
        const bodyC2 = makeWebhookBody(
          "payment.captured",
          "pay_e11_c2",
          String(sessionC2.data.razorpayOrderId),
        );

        // Fire both simultaneously
        const [r1, r2] = await Promise.all([sendWebhook(bodyC1), sendWebhook(bodyC2)]);

        const actions = [r1.data.action, r2.data.action];
        const paidCount = actions.filter((a) => a === "marked_paid").length;
        const insufficientCount = actions.filter((a) => a === "insufficient_stock").length;

        check(
          "concurrent oversell: exactly one marked_paid",
          paidCount === 1,
        );
        check(
          "concurrent oversell: exactly one insufficient_stock",
          insufficientCount === 1,
        );

        const finalProduct = await prisma.product.findUnique({
          where: { sku: testSku },
          select: { stock: true },
        });
        check(
          "concurrent oversell: stock is exactly 0 (not negative)",
          finalProduct?.stock === 0,
        );

        return true;
      } finally {
        await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
      }
    })();
    if (!concurrentPassed) check("concurrent oversell: setup failed", false);
  }

  // ── T8: dandy.json unchanged ──────────────────────────────────────────────
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
    // Guarantee stock is restored even on unexpected failure
    await prisma.$disconnect();
  });
