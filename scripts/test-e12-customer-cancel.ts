/**
 * E12: Customer order cancellation tests.
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
      fullName: "E12 Test User",
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
      fullName: "E12 Buyer",
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
  return (checkout.data as { order?: { id: string } }).order?.id || "";
}

async function main() {
  loadLocalEnv();

  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);

  const product = await prisma.product.findFirst({
    where: { b2cAvailable: true, sellingPrice: { not: null } },
    select: { sku: true, name: true },
  });
  if (!product) throw new Error("No priced b2c product found for E12 tests");
  const { sku: testSku } = product;

  const a = await registerVerified(`e12.a.${stamp}@dandy.test`, `97710${stamp.slice(-5)}`, "E12PassA");
  const b = await registerVerified(`e12.b.${stamp}@dandy.test`, `97711${stamp.slice(-5)}`, "E12PassB");
  check("test customers registered", a.ok && b.ok);

  // T1: Customer can cancel owned PLACED PENDING order
  {
    const orderId = await createOrder(a.cookie, testSku);
    check("T1: order created", Boolean(orderId));

    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T1: customer can cancel PLACED PENDING order", cancel.ok && (cancel.data as { ok?: boolean }).ok === true);

    const after = await api(`/api/customer/orders/${orderId}`, { headers: { Cookie: a.cookie } });
    const afterOrder = (after.data as { order?: { orderStatus?: string } }).order;
    check("T1: orderStatus is CANCELLED", afterOrder?.orderStatus === "CANCELLED");
  }

  // T2: Customer can cancel owned PLACED PAID order and stock is restored
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T2: order created", Boolean(orderId));

    // Simulate payment capture via webhook
    const session = await api("/api/customer/payments/create", {
      method: "POST",
      headers: { Cookie: a.cookie },
      body: JSON.stringify({ addressId: (await addAddress(a.cookie))!.id }),
    });
    const razorpayOrderId = String((session.data as { razorpayOrderId?: string }).razorpayOrderId || "");
    if (razorpayOrderId) {
      const webhookBody = JSON.stringify({
        entity: "event",
        event: "payment.captured",
        contains: ["payment"],
        payload: {
          payment: {
            entity: {
              id: "pay_e12_t2",
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

    const afterCapture = await prisma.product.findUnique({
      where: { sku: testSku },
      select: { stock: true },
    });
    check("T2: stock deducted by capture", afterCapture?.stock === 4);

    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T2: customer can cancel PLACED PAID order", cancel.ok && (cancel.data as { ok?: boolean }).ok === true);

    const afterCancel = await prisma.product.findUnique({
      where: { sku: testSku },
      select: { stock: true },
    });
    check("T2: stock restored after PAID cancellation", afterCancel?.stock === 5);

    const afterOrder = await api(`/api/customer/orders/${orderId}`, { headers: { Cookie: a.cookie } });
    check("T2: orderStatus is CANCELLED", (afterOrder.data as { order?: { orderStatus?: string } }).order?.orderStatus === "CANCELLED");
    check("T2: paymentStatus remains PAID", (afterOrder.data as { order?: { paymentStatus?: string } }).order?.paymentStatus === "PAID");
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // T3: CONFIRMED cannot be cancelled
  {
    const orderId = await createOrder(a.cookie, testSku);
    await api(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Cookie: (await (await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: process.env.ADMIN_EMAIL || "",
          password: process.env.ADMIN_PASSWORD || "",
        }),
      })).res.headers.get("set-cookie") || "").includes("dandy_session=") ? "" : "" },
      body: JSON.stringify({ orderStatus: "CONFIRMED" }),
    });
    // Use admin cookie directly
    const adminLogin = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || "",
        password: process.env.ADMIN_PASSWORD || "",
      }),
    });
    const adminCookie = cookieFrom(adminLogin.res);
    await api(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ orderStatus: "CONFIRMED" }),
    });

    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T3: CONFIRMED cannot be cancelled", cancel.status === 400);
  }

  // T4: SHIPPED cannot be cancelled
  {
    const orderId = await createOrder(a.cookie, testSku);
    const adminLogin = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || "",
        password: process.env.ADMIN_PASSWORD || "",
      }),
    });
    const adminCookie = cookieFrom(adminLogin.res);
    await api(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ orderStatus: "CONFIRMED" }),
    });
    await api(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ orderStatus: "SHIPPED", shippingProvider: "DTDC", trackingNumber: "E12XYZ" }),
    });

    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T4: SHIPPED cannot be cancelled", cancel.status === 400);
  }

  // T5: DELIVERED cannot be cancelled
  {
    const orderId = await createOrder(a.cookie, testSku);
    const adminLogin = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || "",
        password: process.env.ADMIN_PASSWORD || "",
      }),
    });
    const adminCookie = cookieFrom(adminLogin.res);
    await api(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ orderStatus: "CONFIRMED" }),
    });
    await api(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ orderStatus: "SHIPPED", shippingProvider: "DTDC", trackingNumber: "E12ABC" }),
    });
    await api(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
      body: JSON.stringify({ orderStatus: "DELIVERED" }),
    });

    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T5: DELIVERED cannot be cancelled", cancel.status === 400);
  }

  // T6: Another customer's order cannot be cancelled
  {
    const orderId = await createOrder(a.cookie, testSku);
    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: b.cookie },
    });
    check("T6: another customer's order cannot be cancelled", cancel.status === 404);
  }

  // T7: Double cancellation is rejected
  {
    const orderId = await createOrder(a.cookie, testSku);
    const first = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T7: first cancel succeeds", first.ok && (first.data as { ok?: boolean }).ok === true);

    const second = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T7: double cancel rejected", second.status === 400);
  }

  // T8: PENDING cancellation does not restore stock
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T8: order created", Boolean(orderId));

    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T8: PENDING order cancelled", cancel.ok && (cancel.data as { ok?: boolean }).ok === true);

    const afterStock = await prisma.product.findUnique({
      where: { sku: testSku },
      select: { stock: true },
    });
    check("T8: stock unchanged after PENDING cancellation", afterStock?.stock === 5);
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
  }

  // T9: FAILED cancellation does not restore stock
  try {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: 5 } });
    const orderId = await createOrder(a.cookie, testSku);
    check("T9: order created", Boolean(orderId));

    // Simulate payment failure
    const session = await api("/api/customer/payments/create", {
      method: "POST",
      headers: { Cookie: a.cookie },
      body: JSON.stringify({ addressId: (await addAddress(a.cookie))!.id }),
    });
    const razorpayOrderId = String((session.data as { razorpayOrderId?: string }).razorpayOrderId || "");
    if (razorpayOrderId) {
      const webhookBody = JSON.stringify({
        entity: "event",
        event: "payment.failed",
        contains: ["payment"],
        payload: {
          payment: {
            entity: {
              id: "pay_e12_t9",
              order_id: razorpayOrderId,
              status: "failed",
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

    const afterFail = await prisma.order.findFirst({
      where: { id: orderId },
      select: { paymentStatus: true },
    });
    check("T9: paymentStatus is FAILED", afterFail?.paymentStatus === "FAILED");

    const cancel = await api(`/api/customer/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { Cookie: a.cookie },
    });
    check("T9: FAILED order cancelled", cancel.ok && (cancel.data as { ok?: boolean }).ok === true);

    const afterStock = await prisma.product.findUnique({
      where: { sku: testSku },
      select: { stock: true },
    });
    check("T9: stock unchanged after FAILED cancellation", afterStock?.stock === 5);
  } finally {
    await prisma.product.update({ where: { sku: testSku }, data: { stock: null } });
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
    console.error("E12_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
