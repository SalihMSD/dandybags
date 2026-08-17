/**
 * E4 profile + address checks against the local Node server + Neon.
 * Does not print passwords, hashes, or raw tokens.
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

const results: { name: string; ok: boolean; detail?: string }[] = [];

function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name);
}

async function api(path: string, init: RequestInit = {}) {
  const base = process.env.APP_URL || "http://localhost:3000";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": process.env.E4_TEST_IP || `203.0.114.${Date.now() % 250 + 1}`,
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

type Address = {
  id: string;
  userId?: string;
  fullName: string;
  line1: string;
  city: string;
  isDefault: boolean;
};

async function registerVerified(email: string, phone: string, password: string) {
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E4 Test User",
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
  const stamp = String(Date.now()).slice(-8);
  const emailA = `e4a.${stamp}@dandy.test`;
  const emailB = `e4b.${stamp}@dandy.test`;
  const phoneA = `98764${stamp.slice(-5)}`;
  const phoneB = `98664${stamp.slice(-5)}`;
  const phoneC = `98564${stamp.slice(-5)}`;
  const password = "E4TestPass1";
  const jsonBefore = jsonHash();
  const usersBefore = await prisma.user.findMany({ select: { id: true } });
  const userIdsBefore = new Set(usersBefore.map((u) => u.id));

  const unauthProfile = await api("/api/customer/profile");
  check("unauthenticated profile is rejected", unauthProfile.status === 401);

  const unauthAddresses = await api("/api/customer/addresses");
  check("unauthenticated address list is rejected", unauthAddresses.status === 401);

  const unauthCreate = await api("/api/customer/addresses", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Guest",
      phone: phoneA,
      line1: "12 Test Street",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
    }),
  });
  check("unauthenticated address create is rejected", unauthCreate.status === 401);

  const a = await registerVerified(emailA, phoneA, password);
  const b = await registerVerified(emailB, phoneB, password);
  check("test customers registered", a.registered && b.registered && Boolean(a.id && b.id));

  const profile = await api("/api/customer/profile", { headers: { Cookie: a.cookie } });
  const profileBody = profile.data as { user?: Record<string, unknown> };
  check(
    "authenticated customer can read own profile",
    profile.ok && profileBody.user?.email === emailA && profileBody.user?.id === a.id,
  );
  check("password hash is never returned", !("passwordHash" in (profileBody.user || {})));

  const nameUpdate = await api("/api/customer/profile", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      fullName: "E4 Renamed",
      email: emailA,
      phone: phoneA,
      userId: b.id,
    }),
  });
  const nameBody = nameUpdate.data as { user?: { fullName?: string; id?: string } };
  check("customer can update own name", nameUpdate.ok && nameBody.user?.fullName === "E4 Renamed");
  check("client userId cannot change another profile", nameBody.user?.id === a.id);
  const otherUnchanged = await prisma.user.findUnique({ where: { id: b.id } });
  check("other customer profile remains intact", otherUnchanged?.fullName === "E4 Test User");
  const pgName = await prisma.user.findUnique({ where: { id: a.id } });
  check("profile name change appears in PostgreSQL", pgName?.fullName === "E4 Renamed");

  const emailUpdate = await api("/api/customer/profile", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ fullName: "E4 Renamed", email: `e4a2.${stamp}@dandy.test`, phone: phoneA }),
  });
  const emailBody = emailUpdate.data as { user?: { email?: string }; emailChanged?: boolean };
  check(
    "customer can update own email if unique",
    emailUpdate.ok && emailBody.emailChanged === true && emailBody.user?.email === `e4a2.${stamp}@dandy.test`,
  );

  const phoneUpdate = await api("/api/customer/profile", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      fullName: "E4 Renamed",
      email: `e4a2.${stamp}@dandy.test`,
      phone: phoneC,
    }),
  });
  const phoneBody = phoneUpdate.data as { user?: { phone?: string } };
  check("customer can update own phone if unique", phoneUpdate.ok && phoneBody.user?.phone === phoneC);

  const dupEmail = await api("/api/customer/profile", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({ fullName: "E4 Renamed", email: emailB, phone: phoneC }),
  });
  check("duplicate email is rejected", !dupEmail.ok);

  const dupPhone = await api("/api/customer/profile", {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      fullName: "E4 Renamed",
      email: `e4a2.${stamp}@dandy.test`,
      phone: phoneB,
    }),
  });
  check("duplicate phone is rejected", !dupPhone.ok);

  const listEmpty = await api("/api/customer/addresses", { headers: { Cookie: a.cookie } });
  check(
    "authenticated customer can list own addresses",
    listEmpty.ok && Array.isArray((listEmpty.data as { addresses?: unknown[] }).addresses),
  );

  const create1 = await api("/api/customer/addresses", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      fullName: "Home",
      phone: phoneC,
      line1: "12 Test Street",
      line2: "",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      landmark: "",
      isDefault: false,
    }),
  });
  const created = (create1.data as { addresses?: Address[] }).addresses || [];
  check("customer can create an address", create1.ok && created.length === 1 && created[0].isDefault === true);
  const addr1 = created[0];
  const pgAddr = await prisma.address.findUnique({ where: { id: addr1.id } });
  check("address create appears in PostgreSQL", pgAddr?.userId === a.id && pgAddr.line1 === "12 Test Street");

  const create2 = await api("/api/customer/addresses", {
    method: "POST",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      fullName: "Office",
      phone: phoneC,
      line1: "45 Mill Road",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639002",
      isDefault: true,
    }),
  });
  const two = (create2.data as { addresses?: Address[] }).addresses || [];
  const office = two.find((x) => x.fullName === "Office");
  const home = two.find((x) => x.fullName === "Home");
  check(
    "customer can set default address",
    create2.ok && office?.isDefault === true && home?.isDefault === false,
  );

  const update = await api(`/api/customer/addresses/${home?.id}`, {
    method: "PUT",
    headers: { Cookie: a.cookie },
    body: JSON.stringify({
      fullName: "Home Updated",
      phone: phoneC,
      line1: "12 Test Street West",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      isDefault: false,
    }),
  });
  const updated = (update.data as { addresses?: Address[] }).addresses || [];
  check(
    "customer can update own address",
    update.ok && updated.some((x) => x.fullName === "Home Updated" && x.line1 === "12 Test Street West"),
  );

  const bList = await api("/api/customer/addresses", { headers: { Cookie: b.cookie } });
  const bAddresses = (bList.data as { addresses?: Address[] }).addresses || [];
  check("customer cannot read another user's addresses", bList.ok && bAddresses.length === 0);

  const bUpdate = await api(`/api/customer/addresses/${office?.id}`, {
    method: "PUT",
    headers: { Cookie: b.cookie },
    body: JSON.stringify({
      fullName: "Hijack",
      phone: phoneB,
      line1: "99 Other Street",
      city: "Karur",
      state: "Tamil Nadu",
      pincode: "639001",
      isDefault: true,
    }),
  });
  check("customer cannot update another user's address", bUpdate.status === 404);
  const stillOffice = await prisma.address.findUnique({ where: { id: office?.id || "" } });
  check("foreign address was not modified", stillOffice?.fullName === "Office");

  const bDelete = await api(`/api/customer/addresses/${office?.id}`, {
    method: "DELETE",
    headers: { Cookie: b.cookie },
  });
  const afterForeignDelete = await prisma.address.findUnique({ where: { id: office?.id || "" } });
  check("customer cannot delete another user's address", Boolean(afterForeignDelete) && bDelete.ok);

  const del = await api(`/api/customer/addresses/${home?.id}`, {
    method: "DELETE",
    headers: { Cookie: a.cookie },
  });
  const afterDel = (del.data as { addresses?: Address[] }).addresses || [];
  check("customer can delete own address", del.ok && afterDel.length === 1 && afterDel[0].id === office?.id);
  check("remaining address stays in PostgreSQL", (await prisma.address.count({ where: { userId: a.id } })) === 1);

  const leftoverOriginal = usersBefore.filter((u) => userIdsBefore.has(u.id));
  const stillThere = await prisma.user.count({
    where: { id: { in: leftoverOriginal.map((u) => u.id) } },
  });
  check("existing PostgreSQL users remain intact", stillThere === leftoverOriginal.length);

  const jsonAfter = jsonHash();
  check("dandy.json unchanged by profile/address tests", jsonBefore === jsonAfter);

  const failed = results.filter((r) => !r.ok);
  console.log("SUMMARY:passed=" + (results.length - failed.length) + ",failed=" + failed.length);
  if (failed.length) {
    console.log("FAILED_NAMES:" + failed.map((f) => f.name).join(" | "));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E4_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
