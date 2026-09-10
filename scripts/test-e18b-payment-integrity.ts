/**
 * Stage 18B integration tests for payment/inventory data-integrity fixes.
 *
 * Requires the Next.js dev server running on APP_URL (default http://localhost:3000).
 */
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../src/lib/db/prisma";

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

const results: { name: string; ok: boolean }[] = [];

function check(name: string, ok: boolean) {
  results.push({ name, ok });
  console.log((ok ? "PASS " : "FAIL ") + name);
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

async function registerVerified(email: string, phone: string, password: string) {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E18B Test User",
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
      fullName: "E18B Buyer",
      phone: "9876543210",
      line1: "12 Test Street",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      isDefault: true,
    }),
  });
  const addresses = (res.data as { addresses?: { id: string }[] }).addresses ?? [];
  return addresses[0] as { id: string } | undefined;
}

async function createOrder(cookie: string, sku: string, qty = 1) {
  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: cookie },
    body: JSON.stringify({ items: [{ sku, qty }] }),
  });
  const addr = await addAddress(cookie);
  if (!addr) throw new Error("Failed to create address");
  const checkout = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({ addressId: addr.id }),
  });
  return (checkout.data as { order?: { id: string; razorpayOrderId?: string } }).order?.id || "";
}

async function main() {
  loadLocalEnv();

  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);

  const product = await prisma.product.findFirst({
    where: { b2cAvailable: true, sellingPrice: { not: null } },
    select: { sku: true, name: true },
  });
  if (!product) throw new Error("No priced b2c product found for E18B tests");
  const { sku: testSku } = product;

  const a = await registerVerified(`e18b.a.${stamp}@dandy.test`, `97710${stamp.slice(-5)}`, "E18BPassA");
  const b = await registerVerified(`e18b.b.${stamp}@dandy.test`, `97711${stamp.slice(-5)}`, "E18BPassB");
  check("test customers registered", a.ok && b.ok);

  // T1: Webhook after cancellation must not mark PAID or deduct stock
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T1: order created", Boolean(orderId));

    // Cancel the order
    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T1: order cancelled", cancel.ok && (cancel.data as { ok?: boolean }).ok === true);

    // Simulate webhook for cancelled order
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { razorpayOrderId: true } });
    if (order?.razorpayOrderId) {
      const webhookBody = JSON.stringify({
        entity: "event",
        event: "payment.captured",
        contains: ["payment"],
        payload: {
          payment: {
            entity: {
              id: "pay_e18b_t1",
              order_id: order.razorpayOrderId,
              status: "captured",
              currency: "INR",
            },
          },
        },
      });
      await api("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": "stub" },
        body: webhookBody,
      });
    }

    const afterWebhook = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true, orderStatus: true } });
    check("T1: cancelled order stays CANCELLED", afterWebhook?.orderStatus === "CANCELLED");
    check("T1: cancelled order not marked PAID by webhook", afterWebhook?.paymentStatus !== "PAID");

    const afterStock = await prisma.product.findUnique({ where: { sku: testSku }, select: { stock: true } });
    check("T1: stock not deducted for cancelled order", afterStock?.stock === 5);
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // T2: Customer verify before webhook transitions to PAID and deducts stock
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T2: order created", Boolean(orderId));

    const session = await api("/api/customer/payments/create", {
      method: "POST",
      headers: { Cookie: a.cookie },
      body: JSON.stringify({ addressId: (await addAddress(a.cookie))!.id }),
    });
    const razorpayOrderId = String((session.data as { razorpayOrderId?: string }).razorpayOrderId || "");
    if (razorpayOrderId) {
      const verifyBody = JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: "pay_e18b_t2",
        razorpay_signature: "stub",
      });
      await api("/api/customer/payments/verify", {
        method: "POST",
        headers: { Cookie: a.cookie, "Content-Type": "application/json" },
        body: verifyBody,
      });
    }

    const afterVerify = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
    check("T2: customer verify marks PAID", afterVerify?.paymentStatus === "PAID");

    const afterStock = await prisma.product.findUnique({ where: { sku: testSku }, select: { stock: true } });
    check("T2: stock deducted by customer verify", afterStock?.stock === 4);

    // Webhook arriving later should be no-op
    if (razorpayOrderId) {
      const webhookBody = JSON.stringify({
        entity: "event",
        event: "payment.captured",
        contains: ["payment"],
        payload: {
          payment: {
            entity: {
              id: "pay_e18b_t2_dup",
              order_id: razorpayOrderId,
              status: "captured",
              currency: "INR",
            },
          },
        },
      });
      await api("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": "stub" },
        body: webhookBody,
      });
    }

    const afterDup = await prisma.product.findUnique({ where: { sku: testSku }, select: { stock: true } });
    check("T2: duplicate webhook does not double-deduct stock", afterDup?.stock === 4);
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // T3: Guest verify before webhook transitions to PAID and deducts stock
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const session = await api("/api/customer/payments/create", {
      method: "POST",
      headers: { Cookie: b.cookie },
      body: JSON.stringify({ addressId: (await addAddress(b.cookie))!.id }),
    });
    const razorpayOrderId = String((session.data as { razorpayOrderId?: string }).razorpayOrderId || "");
    const orderId = (session.data as { order?: { id: string } }).order?.id || "";
    check("T3: guest order created", Boolean(orderId));

    if (razorpayOrderId) {
      const verifyBody = JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: "pay_e18b_t3",
        razorpay_signature: "stub",
      });
      await api("/api/guest/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: verifyBody,
      });
    }

    const afterVerify = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
    check("T3: guest verify marks PAID", afterVerify?.paymentStatus === "PAID");

    const afterStock = await prisma.product.findUnique({ where: { sku: testSku }, select: { stock: true } });
    check("T3: stock deducted by guest verify", afterStock?.stock === 4);
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // T4: Concurrent admin cancellation does not double-restore stock
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T4: order created", Boolean(orderId));

    // Mark paid via webhook
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { razorpayOrderId: true } });
    if (order?.razorpayOrderId) {
      const webhookBody = JSON.stringify({
        entity: "event",
        event: "payment.captured",
        contains: ["payment"],
        payload: {
          payment: {
            entity: {
              id: "pay_e18b_t4",
              order_id: order.razorpayOrderId,
              status: "captured",
              currency: "INR",
            },
          },
        },
      });
      await api("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": "stub" },
        body: webhookBody,
      });
    }

    const afterCapture = await prisma.product.findUnique({ where: { sku: testSku }, select: { stock: true } });
    check("T4: stock deducted by webhook", afterCapture?.stock === 4);

    // Admin login
    const adminLogin = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || "",
        password: process.env.ADMIN_PASSWORD || "",
      }),
    });
    const adminCookie = cookieFrom(adminLogin.res);

    // Two concurrent admin cancellations
    const [cancel1, cancel2] = await Promise.all([
      api(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { Cookie: adminCookie },
        body: JSON.stringify({ orderStatus: "CANCELLED" }),
      }),
      api(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { Cookie: adminCookie },
        body: JSON.stringify({ orderStatus: "CANCELLED" }),
      }),
    ]);

    check("T4: first admin cancel succeeds", cancel1.ok);
    const secondError = (cancel2.data as { error?: string }).error || "";
    check("T4: second admin cancel rejected", !cancel2.ok || secondError.includes("no longer be cancelled"));

    const afterCancel = await prisma.product.findUnique({ where: { sku: testSku }, select: { stock: true } });
    check("T4: stock restored exactly once", afterCancel?.stock === 5);
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // T5: Cancelled paid order cannot write a review
  {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T5: order created", Boolean(orderId));

    // Mark paid
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { razorpayOrderId: true } });
    if (order?.razorpayOrderId) {
      const webhookBody = JSON.stringify({
        entity: "event",
        event: "payment.captured",
        contains: ["payment"],
        payload: {
          payment: {
            entity: {
              id: "pay_e18b_t5",
              order_id: order.razorpayOrderId,
              status: "captured",
              currency: "INR",
            },
          },
        },
      });
      await api("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": "stub" },
        body: webhookBody,
      });
    }

    // Cancel
    await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });

    // Try to write review
    const review = await api(`/api/customer/orders/${orderId}/reviews`, {
      method: "POST",
      headers: { Cookie: a.cookie },
      body: JSON.stringify({ sku: testSku, rating: 5, title: "Test", comment: "Test" }),
    });
    check("T5: cancelled order cannot review", !review.ok);
  }

  // T6: Cancelled paid order cannot claim share reward
  {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T6: order created", Boolean(orderId));

    // Mark paid
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { razorpayOrderId: true } });
    if (order?.razorpayOrderId) {
      const webhookBody = JSON.stringify({
        entity: "event",
        event: "payment.captured",
        contains: ["payment"],
        payload: {
          payment: {
            entity: {
              id: "pay_e18b_t6",
              order_id: order.razorpayOrderId,
              status: "captured",
              currency: "INR",
            },
          },
        },
      });
      await api("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": "stub" },
        body: webhookBody,
      });
    }

    // Cancel
    await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });

    // Try share reward
    const reward = await api("/api/customer/share-rewards", {
      method: "POST",
      headers: { Cookie: a.cookie },
      body: JSON.stringify({ orderId, rewardType: "STORY_5", instagramUsername: "testuser" }),
    });
    check("T6: cancelled order cannot claim share reward", !reward.ok);
  }

  check("data/dandy.json unchanged", jsonHash() === jsonBefore);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach((f) => console.log("  ✗ " + f.name));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E18B_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
