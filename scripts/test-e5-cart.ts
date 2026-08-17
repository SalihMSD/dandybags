/**
 * E5 cart checks against the local Node server + Neon.
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
      "X-Forwarded-For": process.env.E5_TEST_IP || `203.0.115.${Date.now() % 250 + 1}`,
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

type Item = { sku: string; qty: number; name?: string; slug?: string; image?: string };

async function registerVerified(email: string, phone: string, password: string) {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E5 Test User",
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

async function guestLocalStorageTests() {
  const mem: Record<string, string> = {};
  const g = globalThis as Record<string, unknown>;
  g.window = { dispatchEvent: () => true };
  g.localStorage = {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => {
      mem[k] = v;
    },
  };

  const { addToCart, readCart } = await import("../src/lib/cart");
  const productA = {
    sku: "GUEST-SKU-1",
    slug: "guest-one",
    name: "Guest One",
    images: { front: "/one.jpg" },
  };
  const productB = {
    sku: "GUEST-SKU-2",
    slug: "guest-two",
    name: "Guest Two",
    images: { front: "/two.jpg" },
  };
  addToCart(productA as never, 1);
  check("guest can add item", readCart().some((l) => l.sku === "GUEST-SKU-1" && l.qty === 1));
  check("guest cart remains in localStorage", Boolean(mem["dandy-cart"]?.includes("GUEST-SKU-1")));
  addToCart(productB as never, 2);
  const lines = readCart();
  check(
    "guest cart can contain multiple SKUs",
    lines.some((l) => l.sku === "GUEST-SKU-1") && lines.some((l) => l.sku === "GUEST-SKU-2" && l.qty === 2),
  );
}

async function main() {
  loadLocalEnv();
  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);
  const emailA = `e5a.${stamp}@dandy.test`;
  const emailB = `e5b.${stamp}@dandy.test`;
  const phoneA = `98464${stamp.slice(-5)}`;
  const phoneB = `98364${stamp.slice(-5)}`;
  const password = "E5TestPass1";
  const usersBefore = await prisma.user.count();

  await guestLocalStorageTests();

  const products = await prisma.product.findMany({
    where: { b2cAvailable: true },
    select: { sku: true },
    take: 3,
    orderBy: { sku: "asc" },
  });
  check("b2c products available for cart tests", products.length >= 3);
  const skuA = products[0]?.sku || "";
  const skuB = products[1]?.sku || "";
  const skuC = products[2]?.sku || "";

  const unauthGet = await api("/api/customer/cart");
  check("unauthenticated cart get is rejected", unauthGet.status === 401);
  const unauthPut = await api("/api/customer/cart", {
    method: "PUT",
    body: JSON.stringify({ items: [{ sku: skuA, qty: 1 }] }),
  });
  check("unauthenticated cart put is rejected", unauthPut.status === 401);

  const a = await registerVerified(emailA, phoneA, password);
  const b = await registerVerified(emailB, phoneB, password);
  check("test customers registered", a.registered && b.registered);

  const empty = await api("/api/customer/cart", { headers: { Cookie: a.cookie } });
  check(
    "authenticated customer can retrieve own cart",
    empty.ok && Array.isArray((empty.data as { items?: unknown[] }).items),
  );

  const add = await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      items: [{ sku: skuA, qty: 2, name: "forged", image: "http://evil", userId: b.id }],
      userId: b.id,
    }),
  });
  const added = ((add.data as { items?: Item[] }).items || []).find((i) => i.sku === skuA);
  check("authenticated customer can add item", add.ok && added?.qty === 2);
  check("browser product fields are not trusted", added?.name !== "forged" && added?.image !== "http://evil");

  const qty = await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [{ sku: skuA, qty: 4 }] }),
  });
  check(
    "authenticated customer can update quantity",
    ((qty.data as { items?: Item[] }).items || []).some((i) => i.sku === skuA && i.qty === 4),
  );

  const two = await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [{ sku: skuA, qty: 4 }, { sku: skuB, qty: 1 }] }),
  });
  const removed = await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [{ sku: skuA, qty: 4 }] }),
  });
  const removedItems = (removed.data as { items?: Item[] }).items || [];
  check(
    "authenticated customer can remove item",
    two.ok && removed.ok && removedItems.length === 1 && removedItems[0].sku === skuA,
  );

  const cleared = await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [] }),
  });
  check("authenticated customer can clear cart", cleared.ok && ((cleared.data as { items?: Item[] }).items || []).length === 0);

  await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ items: [{ sku: skuA, qty: 3 }, { sku: skuC, qty: 4 }] }),
  });
  const cartRow = await prisma.cart.findUnique({
    where: { userId: a.id },
    include: { items: true },
  });
  check("cart row exists", Boolean(cartRow));
  check("cart persists in PostgreSQL", (cartRow?.items.length || 0) >= 2);

  await api("/api/auth/logout", { method: "POST", headers: { Cookie: a.cookie } });
  const mergeLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier: emailA,
      password,
      guestCart: [
        { sku: skuA, qty: 2, name: "ignore-me", image: "x" },
        { sku: skuB, qty: 1 },
      ],
    }),
  });
  check("login after guest cart succeeds", mergeLogin.ok);
  const mergedCookie = cookieFrom(mergeLogin.res);
  const merged = await api("/api/customer/cart", { headers: { Cookie: mergedCookie } });
  const mergedItems = (merged.data as { items?: Item[] }).items || [];
  const qtyA = mergedItems.find((i) => i.sku === skuA)?.qty;
  const qtyB = mergedItems.find((i) => i.sku === skuB)?.qty;
  const qtyC = mergedItems.find((i) => i.sku === skuC)?.qty;
  check("guest cart merges into PostgreSQL cart on login", mergeLogin.ok && merged.ok);
  check("same SKU quantities are added", qtyA === 5);
  check("different SKUs are preserved", qtyB === 1 && qtyC === 4);

  const dbItems = await prisma.cartItem.findMany({ where: { cartId: cartRow?.id } });
  const uniqueSkus = new Set(dbItems.map((i) => i.sku));
  check("duplicate CartItem rows are never created", dbItems.length === uniqueSkus.size);
  check(
    "CartItems reference valid Product SKUs",
    dbItems.every((i) => [skuA, skuB, skuC].includes(i.sku)),
  );

  const beforeInvalid = await prisma.cartItem.findMany({ where: { cartId: cartRow?.id } });
  await api("/api/auth/logout", { method: "POST", headers: { Cookie: mergedCookie } });
  const invalidLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier: emailA,
      password,
      guestCart: [{ sku: "NOT-A-REAL-SKU", qty: 9, name: "fake" }],
    }),
  });
  const afterInvalidCookie = cookieFrom(invalidLogin.res);
  const afterInvalid = await api("/api/customer/cart", { headers: { Cookie: afterInvalidCookie } });
  const afterInvalidItems = (afterInvalid.data as { items?: Item[] }).items || [];
  check("invalid guest SKU is rejected safely", invalidLogin.ok && !afterInvalidItems.some((i) => i.sku === "NOT-A-REAL-SKU"));
  check(
    "existing server cart is not lost",
    afterInvalidItems.find((i) => i.sku === skuA)?.qty === 5 &&
      afterInvalidItems.find((i) => i.sku === skuC)?.qty === 4,
  );
  check("merge is transactional", beforeInvalid.length === (await prisma.cartItem.count({ where: { cartId: cartRow?.id } })));

  const bGet = await api("/api/customer/cart", { headers: { Cookie: b.cookie } });
  const bItems = (bGet.data as { items?: Item[] }).items || [];
  check("customer cannot access another customer's cart", bGet.ok && bItems.length === 0);

  const bPut = await api("/api/customer/cart", {
    method: "PUT",
    headers: { Cookie: b.cookie },
    body: JSON.stringify({ items: [{ sku: skuA, qty: 1 }], userId: a.id }),
  });
  const aAfter = await api("/api/customer/cart", { headers: { Cookie: afterInvalidCookie } });
  const aQty = ((aAfter.data as { items?: Item[] }).items || []).find((i) => i.sku === skuA)?.qty;
  check("client-supplied userId cannot bypass ownership", bPut.ok && aQty === 5);
  const bOwn = ((bPut.data as { items?: Item[] }).items || []).find((i) => i.sku === skuA)?.qty;
  check("put with foreign userId still writes only own cart", bOwn === 1);

  await api("/api/auth/logout", { method: "POST", headers: { Cookie: afterInvalidCookie } });
  const again = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: emailA, password }),
  });
  const restored = await api("/api/customer/cart", { headers: { Cookie: cookieFrom(again.res) } });
  check("logout does not delete persistent cart", ((restored.data as { items?: Item[] }).items || []).find((i) => i.sku === skuA)?.qty === 5);
  check("login again restores PostgreSQL cart", restored.ok && ((restored.data as { items?: Item[] }).items || []).length >= 3);

  const usersAfter = await prisma.user.count();
  check("existing users were not deleted", usersAfter >= usersBefore + 2);
  check("dandy.json unchanged by cart tests", jsonBefore === jsonHash());

  const failed = results.filter((r) => !r.ok);
  console.log("SUMMARY:passed=" + (results.length - failed.length) + ",failed=" + failed.length);
  if (failed.length) {
    console.log("FAILED_NAMES:" + failed.map((f) => f.name).join(" | "));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E5_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
