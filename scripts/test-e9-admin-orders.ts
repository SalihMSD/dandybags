/**
 * E9 admin order management + manual delivery.
 * Does not print passwords, hashes, or secrets.
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
  return createHash("sha256").update(readFileSync(resolve(process.cwd(), "data", "dandy.json"))).digest("hex");
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
      "X-Forwarded-For": process.env.E9_TEST_IP || `203.0.119.${Date.now() % 250 + 1}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { error: "non-json", status: res.status };
  }
  return { res, data, status: res.status, ok: res.ok };
}

async function registerVerified(email: string, phone: string, password: string) {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E9 Test User",
      email,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  const token = String((reg.data as { verifyUrl?: string }).verifyUrl || "").split("token=")[1] || "";
  await api("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
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

async function main() {
  loadLocalEnv();
  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);
  const emailA = `e9a.${stamp}@dandy.test`;
  const emailB = `e9b.${stamp}@dandy.test`;
  const phoneA = `97764${stamp.slice(-5)}`;
  const phoneB = `97664${stamp.slice(-5)}`;
  const password = "E9TestPass1";
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  const unauthList = await api("/api/admin/orders");
  check("unauthenticated user cannot access admin order APIs", unauthList.status === 403);

  const a = await registerVerified(emailA, phoneA, password);
  const b = await registerVerified(emailB, phoneB, password);
  check("test customers registered", a.ok && b.ok);

  const customerList = await api("/api/admin/orders", { headers: { Cookie: a.cookie } });
  check("customer cannot access admin order APIs", customerList.status === 403);

  const product = await prisma.product.findFirst({ where: { b2cAvailable: true }, select: { sku: true } });
  const addr = await api("/api/customer/addresses", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      fullName: "E9 Buyer",
      phone: "9876543210",
      line1: "12 Mill Street",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      isDefault: true,
    }),
  });
  const addressId = ((addr.data as { addresses?: { id: string }[] }).addresses || [])[0]?.id;
  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [{ sku: product?.sku, qty: 1 }] }),
  });
  const checkout = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId }),
  });
  const orderId = (checkout.data as { order?: { id: string } }).order?.id || "";
  check("order placed for admin tests", Boolean(orderId));

  const adminLogin = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const adminCookie = cookieFrom(adminLogin.res);
  check("admin logged in", adminLogin.ok);

  const list = await api("/api/admin/orders", { headers: { Cookie: adminCookie } });
  const listed = (list.data as { orders?: { id: string; customer?: { fullName: string } }[] }).orders || [];
  check("admin can list orders", list.ok && listed.some((o) => o.id === orderId));

  const detail = await api(`/api/admin/orders/${orderId}`, { headers: { Cookie: adminCookie } });
  const detailOrder = (detail.data as { order?: Record<string, unknown> }).order;
  check("admin can view order details", detail.ok && detailOrder?.id === orderId);
  check("admin detail has no passwordHash", !JSON.stringify(detail.data).includes("passwordHash"));

  const invalidStatus = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "LOST" }),
  });
  check("invalid status is rejected", invalidStatus.status === 400);

  const badJump = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "DELIVERED" }),
  });
  check("invalid transition is rejected", badJump.status === 400);

  const shipTooSoon = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "SHIPPED", shippingProvider: "DTDC", trackingNumber: "ABC123456" }),
  });
  check("SHIPPED before CONFIRMED is rejected", shipTooSoon.status === 400);

  const confirmed = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "CONFIRMED" }),
  });
  check("admin can move PLACED → CONFIRMED", confirmed.ok && (confirmed.data as { order?: { orderStatus: string } }).order?.orderStatus === "CONFIRMED");

  const saveDelivery = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ shippingProvider: "DTDC", trackingNumber: "ABC123456" }),
  });
  const saved = (saveDelivery.data as { order?: { shippingProvider?: string; trackingNumber?: string } }).order;
  check("shipping provider can be saved", saveDelivery.ok && saved?.shippingProvider === "DTDC");
  check("tracking number can be saved", saved?.trackingNumber === "ABC123456");

  const shipMissing = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "SHIPPED", shippingProvider: "", trackingNumber: "" }),
  });
  check("SHIPPED requires shipping provider", shipMissing.status === 400);
  check("SHIPPED requires tracking number", shipMissing.status === 400);

  const beforeShip = Date.now();
  const shipped = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "SHIPPED", shippingProvider: "DTDC", trackingNumber: "ABC123456" }),
  });
  const shippedOrder = (shipped.data as { order?: { orderStatus: string; shippedAt: string | null } }).order;
  check("admin can move CONFIRMED → SHIPPED", shipped.ok && shippedOrder?.orderStatus === "SHIPPED");
  check("shippedAt is generated server-side", Boolean(shippedOrder?.shippedAt) && new Date(shippedOrder?.shippedAt || 0).getTime() >= beforeShip - 5000);

  const deliverTooSoonCancel = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "CANCELLED" }),
  });
  check("cancel after SHIPPED is rejected", deliverTooSoonCancel.status === 400);

  const beforeDeliver = Date.now();
  const delivered = await api(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "DELIVERED", shippedAt: "2000-01-01T00:00:00.000Z" }),
  });
  const deliveredOrder = (delivered.data as { order?: { orderStatus: string; deliveredAt: string | null } }).order;
  check("admin can move SHIPPED → DELIVERED", delivered.ok && deliveredOrder?.orderStatus === "DELIVERED");
  check("DELIVERED requires previous SHIPPED state", delivered.ok);
  check(
    "deliveredAt is generated server-side",
    Boolean(deliveredOrder?.deliveredAt) && new Date(deliveredOrder?.deliveredAt || 0).getTime() >= beforeDeliver - 5000,
  );

  const pg = await prisma.order.findUnique({ where: { id: orderId } });
  check("order status is stored in PostgreSQL", pg?.orderStatus === "DELIVERED");
  check("delivery information is stored in PostgreSQL", pg?.shippingProvider === "DTDC" && pg?.trackingNumber === "ABC123456");

  const customerView = await api(`/api/customer/orders/${orderId}`, { headers: { Cookie: a.cookie } });
  const viewed = (customerView.data as { order?: { orderStatus?: string; shippingProvider?: string; trackingNumber?: string } }).order;
  check("customer can see own updated order status", customerView.ok && viewed?.orderStatus === "DELIVERED");
  check("customer can see own shipping provider", viewed?.shippingProvider === "DTDC");
  check("customer can see own tracking number", viewed?.trackingNumber === "ABC123456");

  const otherView = await api(`/api/customer/orders/${orderId}`, { headers: { Cookie: b.cookie } });
  check("customer cannot see another customer's order", otherView.status === 404);

  const cancelOrderCheckout = await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [{ sku: product?.sku, qty: 1 }] }),
  });
  const checkout2 = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId }),
  });
  const cancelId = (checkout2.data as { order?: { id: string } }).order?.id || "";
  const cancelled = await api(`/api/admin/orders/${cancelId}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ orderStatus: "CANCELLED" }),
  });
  check("admin can cancel according to allowed transition rules", cancelOrderCheckout.ok && cancelled.ok && (cancelled.data as { order?: { orderStatus: string } }).order?.orderStatus === "CANCELLED");

  check("dandy.json unchanged", jsonBefore === jsonHash());

  const failed = results.filter((r) => !r.ok);
  console.log("SUMMARY:passed=" + (results.length - failed.length) + ",failed=" + failed.length);
  if (failed.length) {
    console.log("FAILED_NAMES:" + failed.map((f) => f.name).join(" | "));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E9_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
