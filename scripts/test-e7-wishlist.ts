/**
 * E7 wishlist checks against the local Node server + Neon.
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
      "X-Forwarded-For": process.env.E7_TEST_IP || `203.0.117.${Date.now() % 250 + 1}`,
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
      fullName: "E7 Test User",
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

async function main() {
  loadLocalEnv();
  const jsonBefore = jsonHash();
  const stamp = String(Date.now()).slice(-8);
  const emailA = `e7a.${stamp}@dandy.test`;
  const emailB = `e7b.${stamp}@dandy.test`;
  const phoneA = `98064${stamp.slice(-5)}`;
  const phoneB = `97964${stamp.slice(-5)}`;
  const password = "E7TestPass1";

  const product = await prisma.product.findFirst({
    where: { b2cAvailable: true },
    select: { sku: true, name: true, slug: true, imageFront: true },
  });
  check("product available", Boolean(product?.sku));
  const sku = product?.sku || "";

  const unauth = await api("/api/customer/wishlist");
  check("unauthenticated customer is rejected", unauth.status === 401);

  const a = await registerVerified(emailA, phoneA, password);
  const b = await registerVerified(emailB, phoneB, password);
  check("test customers registered", a.registered && b.registered);

  const empty = await api("/api/customer/wishlist", { headers: { Cookie: a.cookie } });
  check(
    "authenticated customer can get wishlist",
    empty.ok && Array.isArray((empty.data as { items?: unknown[] }).items) &&
      ((empty.data as { items?: unknown[] }).items || []).length === 0,
  );

  const invalid = await api("/api/customer/wishlist", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ sku: "NOT-A-REAL-SKU", userId: b.id }),
  });
  check("invalid SKU is rejected", invalid.status === 404);

  const add = await api("/api/customer/wishlist", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ sku, name: "forged", userId: b.id }),
  });
  check("customer can add a valid product SKU", add.ok);

  const listed = await api("/api/customer/wishlist", { headers: { Cookie: a.cookie } });
  const items = (listed.data as { items?: Record<string, unknown>[] }).items || [];
  check("wishlist product information comes from PostgreSQL Product", items.length === 1 && items[0].sku === sku && items[0].name === product?.name && items[0].slug === product?.slug);
  check("no B2B fields are returned", items.every((item) => !("b2bPrice" in item) && !("b2bAvailable" in item)));
  check("wishlist data is stored in PostgreSQL", (await prisma.wishlist.count({ where: { userId: a.id, sku } })) === 1);

  const dup = await api("/api/customer/wishlist", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ sku }),
  });
  check("duplicate add remains successful", dup.ok);
  check("duplicate SKU does not create duplicate rows", (await prisma.wishlist.count({ where: { userId: a.id, sku } })) === 1);

  const bGet = await api("/api/customer/wishlist", { headers: { Cookie: b.cookie } });
  check(
    "customer cannot access another customer's wishlist",
    bGet.ok && ((bGet.data as { items?: unknown[] }).items || []).length === 0,
  );

  const bDelete = await api("/api/customer/wishlist", {
    method: "DELETE",
    headers: { Cookie: b.cookie },
    body: JSON.stringify({ sku, userId: a.id }),
  });
  check("foreign delete request does not error", bDelete.ok);
  check(
    "customer cannot remove another customer's wishlist item",
    (await prisma.wishlist.count({ where: { userId: a.id, sku } })) === 1,
  );

  const remove = await api("/api/customer/wishlist", {
    method: "DELETE",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ sku }),
  });
  check("customer can remove own wishlist item", remove.ok);
  check("item removed from PostgreSQL", (await prisma.wishlist.count({ where: { userId: a.id, sku } })) === 0);

  await api("/api/customer/wishlist", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ sku }),
  });
  await api("/api/customer/wishlist", {
    method: "DELETE",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ sku }),
  });
  const cleared = await api("/api/customer/wishlist", { headers: { Cookie: a.cookie } });
  check(
    "customer can clear own wishlist",
    ((cleared.data as { items?: unknown[] }).items || []).length === 0,
  );

  const jsonFile = JSON.parse(readFileSync(resolve(process.cwd(), "data", "dandy.json"), "utf8")) as {
    wishlist?: unknown[];
  };
  check("dandy.json wishlist unchanged", jsonBefore === jsonHash());
  check("wishlist API no longer writes dandy.json", (jsonFile.wishlist || []).length === 0);

  const failed = results.filter((r) => !r.ok);
  console.log("SUMMARY:passed=" + (results.length - failed.length) + ",failed=" + failed.length);
  if (failed.length) {
    console.log("FAILED_NAMES:" + failed.map((f) => f.name).join(" | "));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E7_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
