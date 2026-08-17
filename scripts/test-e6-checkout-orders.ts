/**
 * E6 checkout + order checks against the local Node server + Neon.
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
      "X-Forwarded-For": process.env.E6_TEST_IP || `203.0.116.${Date.now() % 250 + 1}`,
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
      fullName: "E6 Test User",
      email,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  const regBody = reg.data as { user?: { id: string }; verifyUrl?: string };
  const token = String(regBody.verifyUrl || "").split("token=")[1] || "";
  const verify = await api("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  return {
    id: regBody.user?.id || "",
    cookie: cookieFrom(login.res),
    registered: reg.ok && verify.ok && login.ok,
  };
}

async function addAddress(cookie: string, fullName: string) {
  const res = await api("/api/customer/addresses", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      fullName,
      phone: "9876543210",
      line1: "12 Mill Street",
      line2: "Near temple",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      landmark: "Clock tower",
      isDefault: true,
    }),
  });
  const addresses = (res.data as { addresses?: { id: string; fullName: string }[] }).addresses || [];
  return addresses[0];
}

async function main() {
  loadLocalEnv();
  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);
  const emailA = `e6a.${stamp}@dandy.test`;
  const emailB = `e6b.${stamp}@dandy.test`;
  const phoneA = `98264${stamp.slice(-5)}`;
  const phoneB = `98164${stamp.slice(-5)}`;
  const password = "E6TestPass1";

  const product = await prisma.product.findFirst({
    where: { b2cAvailable: true },
    select: { sku: true, name: true, slug: true, imageFront: true, sellingPrice: true },
  });
  check("b2c product available", Boolean(product?.sku));
  const sku = product?.sku || "";

  const unauth = await api("/api/customer/checkout", {
    method: "POST",
    body: JSON.stringify({ addressId: "adr_x" }),
  });
  check("unauthenticated checkout is rejected", unauth.status === 401);

  const a = await registerVerified(emailA, phoneA, password);
  const b = await registerVerified(emailB, phoneB, password);
  check("test customers registered", a.registered && b.registered);

  const emptyHistory = await api("/api/customer/orders", { headers: { Cookie: a.cookie } });
  check(
    "empty order history works",
    emptyHistory.ok && Array.isArray((emptyHistory.data as { orders?: unknown[] }).orders) &&
      ((emptyHistory.data as { orders?: unknown[] }).orders || []).length === 0,
  );

  const addrA = await addAddress(a.cookie, "E6 Buyer");
  const addrB = await addAddress(b.cookie, "E6 Other");
  check("addresses created", Boolean(addrA?.id && addrB?.id));

  const emptyCheckout = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId: addrA?.id }),
  });
  check("empty PostgreSQL cart is rejected", emptyCheckout.status === 400);

  const invalidAddr = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId: "adr_does_not_exist" }),
  });
  check("invalid address ID is rejected", invalidAddr.status === 400);

  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [{ sku: "NOT-A-REAL-SKU", qty: 1, name: "Fake" }] }),
  });
  const fakeSku = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId: addrA?.id }),
  });
  check("invalid product SKU cannot create an order", fakeSku.status === 400);

  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      items: [{ sku, qty: 2, name: "forged-name", image: "forged.png", price: 1 }],
      userId: b.id,
    }),
  });

  const foreignAddr = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId: addrB?.id, userId: b.id }),
  });
  check("address belonging to another customer is rejected", foreignAddr.status === 400);
  const cartAfterForeign = await api("/api/customer/cart", { headers: { Cookie: a.cookie } });
  check(
    "failed order does not partially clear the cart",
    ((cartAfterForeign.data as { items?: { qty: number }[] }).items || [])[0]?.qty === 2,
  );
  check(
    "failed order does not create partial order records",
    (await prisma.order.count({ where: { userId: a.id } })) === 0,
  );

  await prisma.product.update({ where: { sku }, data: { b2cAvailable: false } });
  const unavailable = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId: addrA?.id }),
  });
  check("B2C-unavailable product cannot be ordered", unavailable.status === 400);
  await prisma.product.update({ where: { sku }, data: { b2cAvailable: true } });

  const cartRow = await prisma.cart.findUnique({
    where: { userId: a.id },
    include: { items: true },
  });
  if (cartRow?.items[0]) {
    await prisma.cartItem.update({ where: { id: cartRow.items[0].id }, data: { qty: 0 } });
  }
  const badQty = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ addressId: addrA?.id }),
  });
  check("invalid quantity cannot create an order", badQty.status === 400);
  if (cartRow?.items[0]) {
    await prisma.cartItem.update({ where: { id: cartRow.items[0].id }, data: { qty: 2 } });
  }

  const placed = await api("/api/customer/checkout", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      addressId: addrA?.id,
      userId: b.id,
      items: [{ sku: "NOT-A-REAL-SKU", qty: 9, name: "hack", image: "hack.png" }],
      total: "99999",
    }),
  });
  const order = placed.data as {
    order?: {
      id: string;
      userId: string;
      totalLabel: string;
      paymentStatus: string;
      orderStatus: string;
      items: { sku: string; name: string; qty: number; slug: string; image: string; unitPrice: number | null }[];
      shippingAddress: { fullName: string; phone: string; line1: string; city: string; landmark: string };
    };
  };
  check("authenticated customer can place an order", placed.ok && Boolean(order.order?.id));
  check("customer can checkout using own PostgreSQL address", order.order?.shippingAddress.fullName === "E6 Buyer");
  check("order belongs to authenticated customer", order.order?.userId === a.id);
  check("correct shipping snapshot is stored", order.order?.shippingAddress.line1 === "12 Mill Street" && order.order?.shippingAddress.landmark === "Clock tower");
  check("orderStatus is PLACED", order.order?.orderStatus === "PLACED");
  check("paymentStatus is PENDING", order.order?.paymentStatus === "PENDING");
  check("totalLabel preserved as placeholder", order.order?.totalLabel === "To be updated");
  check("OrderItems created", (order.order?.items.length || 0) === 1 && order.order?.items[0].sku === sku);
  check("OrderItem snapshot fields are stored", order.order?.items[0].name === product?.name && order.order?.items[0].slug === product?.slug && order.order?.items[0].image === product?.imageFront);
  check("cart products are loaded from PostgreSQL", order.order?.items[0].name !== "hack" && order.order?.items[0].qty === 2);

  const pgOrder = await prisma.order.findUnique({
    where: { id: order.order?.id || "" },
    include: { items: true },
  });
  check("order created in PostgreSQL", Boolean(pgOrder));
  check("order items exist in PostgreSQL", (pgOrder?.items.length || 0) === 1);
  check("no Product FK on OrderItem", !("productId" in (pgOrder?.items[0] || {})));

  const cartCleared = await api("/api/customer/cart", { headers: { Cookie: a.cookie } });
  check("cart clears only after successful order creation", ((cartCleared.data as { items?: unknown[] }).items || []).length === 0);

  const renamed = `${product?.name || "Bag"}-changed`;
  await prisma.product.update({ where: { sku }, data: { name: renamed } });
  const detail = await api(`/api/customer/orders/${order.order?.id}`, { headers: { Cookie: a.cookie } });
  const detailOrder = (detail.data as { order?: { items: { name: string }[] } }).order;
  check("customer can view own order", detail.ok && detailOrder?.items[0].name === product?.name);
  check("order history uses stored OrderItem snapshot", detailOrder?.items[0].name !== renamed);
  await prisma.product.update({ where: { sku }, data: { name: product?.name || "" } });

  const list = await api("/api/customer/orders", { headers: { Cookie: a.cookie } });
  const listed = (list.data as { orders?: { id: string }[] }).orders || [];
  check("customer can list own orders", list.ok && listed.some((o) => o.id === order.order?.id));

  const bList = await api("/api/customer/orders", { headers: { Cookie: b.cookie } });
  check("customer cannot list another customer's orders", ((bList.data as { orders?: { id: string }[] }).orders || []).every((o) => o.id !== order.order?.id));

  const bDetail = await api(`/api/customer/orders/${order.order?.id}`, { headers: { Cookie: b.cookie } });
  check("customer cannot view another customer's order", bDetail.status === 404);

  const jsonOrders = JSON.parse(readFileSync(resolve(process.cwd(), "data", "dandy.json"), "utf8")) as { orders?: unknown[] };
  check("no new orders written to dandy.json", (jsonOrders.orders || []).length === 0);
  check("dandy.json unchanged by checkout tests", jsonBefore === jsonHash());

  const failed = results.filter((r) => !r.ok);
  console.log("SUMMARY:passed=" + (results.length - failed.length) + ",failed=" + failed.length);
  if (failed.length) {
    console.log("FAILED_NAMES:" + failed.map((f) => f.name).join(" | "));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E6_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
