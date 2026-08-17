/**
 * E10-A Razorpay TEST MODE payment foundation.
 * Does not print passwords, hashes, or secrets.
 */
import { createHash, createHmac } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../src/lib/db/prisma";
import { calculatePayable, rupeesToPaise } from "../src/lib/payments/amount";

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

function hasSecretLeak(data: Record<string, unknown>) {
  const dumped = JSON.stringify(data);
  if (Object.prototype.hasOwnProperty.call(data, "keySecret") || Object.prototype.hasOwnProperty.call(data, "RAZORPAY_KEY_SECRET")) {
    return true;
  }
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (secret && dumped.includes(secret)) return true;
  return /key_secret|keySecret/i.test(dumped);
}

async function api(path: string, init: RequestInit = {}) {
  const base = process.env.APP_URL || "http://localhost:3000";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": process.env.E10A_TEST_IP || `203.0.120.${Date.now() % 250 + 1}`,
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
      fullName: "E10A Test User",
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

async function addAddress(cookie: string) {
  const res = await api("/api/customer/addresses", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      fullName: "E10A Buyer",
      phone: "9876543210",
      line1: "12 Mill Street",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      isDefault: true,
    }),
  });
  const addresses = (res.data as { addresses?: { id: string }[] }).addresses || [];
  return addresses[0];
}

async function main() {
  loadLocalEnv();
  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);
  const email = `e10a.${stamp}@dandy.test`;
  const phone = `97564${stamp.slice(-5)}`;
  const password = "E10ATestPass1";
  const configured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

  const product = await prisma.product.findFirst({
    where: { b2cAvailable: true, sellingPrice: { not: null } },
    select: { sku: true, sellingPrice: true },
  });
  check("b2c product with PostgreSQL sellingPrice available", Boolean(product?.sku && product.sellingPrice != null));

  const qty = 2;
  const rupees = Number(product?.sellingPrice);
  const expectedPaise = rupeesToPaise(rupees) * qty;
  const calc = calculatePayable([
    { qty, sellingPrice: product?.sellingPrice, b2cAvailable: true },
  ]);
  check("server calculates amount from PostgreSQL sellingPrice", calc.ok && calc.ok && calc.amountPaise === expectedPaise);
  check("amount is converted correctly to paise", calc.ok && calc.amountPaise === Math.round(rupees * 100) * qty);

  const unauth = await api("/api/customer/payments/create", {
    method: "POST",
    body: JSON.stringify({ addressId: "adr_x", amount: 1 }),
  });
  check("customer authentication required", unauth.status === 401);

  const user = await registerVerified(email, phone, password);
  check("test customer registered", user.ok);
  const addr = await addAddress(user.cookie);
  check("address created", Boolean(addr?.id));

  const empty = await api("/api/customer/payments/create", {
    method: "POST",
    headers: { Cookie: user.cookie },
    body: JSON.stringify({ addressId: addr?.id, amount: 999999, total: 1 }),
  });
  check("invalid/empty cart rejected", empty.status === 400);

  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: user.cookie },
    body: JSON.stringify({
      items: [{ sku: product?.sku, qty, name: "Client Fake Name", price: 1, sellingPrice: 1, total: 1 }],
    }),
  });

  const created = await api("/api/customer/payments/create", {
    method: "POST",
    headers: { Cookie: user.cookie },
    body: JSON.stringify({
      addressId: addr?.id,
      amount: 1,
      total: 1,
      price: 1,
      sellingPrice: 1,
    }),
  });

  if (!configured) {
    check("Razorpay TEST keys are configured for API order tests", false);
  }

  check("client cannot override amount", created.ok && created.data.amount === expectedPaise);
  check("Razorpay order uses server-calculated amount", created.ok && created.data.amount === expectedPaise);
  check("product price comes from PostgreSQL", created.ok && created.data.amount === expectedPaise);
  check(
    "Key Secret never returned to client",
    !hasSecretLeak(created.data) && !Object.prototype.hasOwnProperty.call(created.data, "keySecret"),
  );

  const orderId = String(created.data.orderId || "");
  const razorpayOrderId = String(created.data.razorpayOrderId || "");
  const stored = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        select: { razorpayOrderId: true, paymentStatus: true },
      })
    : null;
  check("razorpayOrderId stored correctly", Boolean(stored?.razorpayOrderId && stored.razorpayOrderId === razorpayOrderId));

  const duplicate = await api("/api/customer/payments/create", {
    method: "POST",
    headers: { Cookie: user.cookie },
    body: JSON.stringify({ addressId: addr?.id, amount: 1 }),
  });
  check(
    "duplicate Pay request handled safely",
    duplicate.ok &&
      duplicate.data.orderId === orderId &&
      duplicate.data.razorpayOrderId === razorpayOrderId,
  );

  const count = await prisma.order.count({ where: { userId: user.id } });
  check("duplicate Pay did not create a second internal order", count === 1);

  const badVerify = await api("/api/customer/payments/verify", {
    method: "POST",
    headers: { Cookie: user.cookie },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: "pay_fake",
      razorpay_signature: "invalid",
    }),
  });
  check("invalid signature is rejected server-side", badVerify.status === 400);
  const afterBad = orderId
    ? await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true, razorpayPaymentId: true } })
    : null;
  check("invalid verify does not mark PAID", afterBad?.paymentStatus === "PENDING" && !afterBad.razorpayPaymentId);

  if (configured && razorpayOrderId) {
    const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpayOrderId}|pay_e10a_test`)
      .digest("hex");
    const goodVerify = await api("/api/customer/payments/verify", {
      method: "POST",
      headers: { Cookie: user.cookie },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: "pay_e10a_test",
        razorpay_signature: signature,
      }),
    });
    const afterGood = await prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, razorpayPaymentId: true },
    });
    check(
      "verified signature stores payment id without marking PAID",
      goodVerify.ok && afterGood?.razorpayPaymentId === "pay_e10a_test" && afterGood.paymentStatus === "PENDING",
    );
  }

  const jsonAfter = jsonHash();
  check("data/dandy.json was not written", jsonBefore === jsonAfter);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "test failed");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
