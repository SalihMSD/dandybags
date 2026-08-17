/**
 * E8 admin overview checks against the local Node server + Neon.
 * Does not print passwords, hashes, tokens, or secrets.
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

function payloadHasSecret(value: unknown): boolean {
  const text = JSON.stringify(value);
  return (
    text.includes("passwordHash") ||
    text.includes("DATABASE_URL") ||
    text.includes("tokenHash") ||
    text.includes("AUTH_SECRET")
  );
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
      "X-Forwarded-For": process.env.E8_TEST_IP || `203.0.118.${Date.now() % 250 + 1}`,
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

async function main() {
  loadLocalEnv();
  const jsonBefore = jsonHash();
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  const unauth = await api("/api/admin/overview");
  check("unauthenticated user cannot access admin overview", unauth.status === 403);

  const customer = await prisma.user.findFirst({
    where: { role: "CUSTOMER", status: "ACTIVE", emailVerified: true },
    select: { email: true },
  });
  if (customer?.email) {
    const custLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: customer.email, password: "WrongPass1" }),
    });
    check("customer wrong-password login does not yield admin cookie", !cookieFrom(custLogin.res) || custLogin.status === 401);
  }

  const stamp = String(Date.now()).slice(-8);
  const email = `e8c.${stamp}@dandy.test`;
  const phone = `97864${stamp.slice(-5)}`;
  const password = "E8TestPass1";
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E8 Customer",
      email,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  const verifyUrl = String((reg.data as { verifyUrl?: string }).verifyUrl || "");
  await api("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verifyUrl.split("token=")[1] || "" }),
  });
  const custOk = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  const customerOverview = await api("/api/admin/overview", {
    headers: { Cookie: cookieFrom(custOk.res) },
  });
  check("CUSTOMER cannot access admin overview", customerOverview.status === 403);

  const adminLogin = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  check("admin can login", adminLogin.ok);
  const overview = await api("/api/admin/overview", {
    headers: { Cookie: cookieFrom(adminLogin.res) },
  });
  check("ADMIN can access admin overview", overview.ok);

  const body = overview.data as {
    customers?: Record<string, unknown>[];
    orders?: Record<string, unknown>[];
    counts?: { customers?: number; orders?: number; addresses?: number };
  };
  const [customerCount, orderCount, addressCount] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.address.count(),
  ]);
  check("customer count matches PostgreSQL", body.counts?.customers === customerCount);
  check("order count matches PostgreSQL", body.counts?.orders === orderCount);
  check("address count matches PostgreSQL", body.counts?.addresses === addressCount);
  check("customer data comes from PostgreSQL", (body.customers?.length || 0) === customerCount);
  check("order data comes from PostgreSQL", (body.orders?.length || 0) === orderCount);
  check("existing response shape preserved", Boolean(body.customers) && Boolean(body.orders) && Boolean(body.counts));

  const sample = body.orders?.[0] as { items?: unknown; shippingAddress?: unknown; createdAt?: string } | undefined;
  if (orderCount > 0) {
    check("order items use stored snapshots", Array.isArray(sample?.items) && Boolean(sample?.shippingAddress));
  } else {
    check("order items use stored snapshots", true);
  }

  const serialized = JSON.stringify(overview.data);
  check("passwordHash never appears", !serialized.includes("passwordHash"));
  check("auth tokens never appear", !serialized.includes("tokenHash") && !serialized.includes("verifyUrl"));
  check("session secrets never appear", !serialized.includes("AUTH_SECRET"));
  check("DATABASE_URL never appears", !serialized.includes("DATABASE_URL") && !payloadHasSecret(overview.data));
  check("customers omit passwordHash field", (body.customers || []).every((c) => !("passwordHash" in c)));

  check("dandy.json remains intact", jsonBefore === jsonHash());

  const failed = results.filter((r) => !r.ok);
  console.log("SUMMARY:passed=" + (results.length - failed.length) + ",failed=" + failed.length);
  if (failed.length) {
    console.log("FAILED_NAMES:" + failed.map((f) => f.name).join(" | "));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E8_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
