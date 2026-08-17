/**
 * E3 auth checks against the local Node server + Neon.
 * Does not print passwords, hashes, or raw tokens.
 */
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../src/lib/db/prisma";
import { issueAuthToken } from "../src/lib/db/tokens";
import { ensureAdminUser } from "../src/lib/db/users";

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
      "X-Forwarded-For": process.env.E3_TEST_IP || `203.0.113.${Date.now() % 250 + 1}`,
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
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const stamp = String(Date.now()).slice(-8);
  const email = `e3test.${stamp}@dandy.test`;
  const email2 = `e3test2.${stamp}@dandy.test`;
  const phone = `98765${stamp.slice(-5)}`;
  const phone2 = `98665${stamp.slice(-5)}`;
  const password = "E3TestPass1";
  const jsonBefore = jsonHash();
  const adminsBefore = await prisma.user.count({ where: { role: "ADMIN" } });
  const customersBefore = await prisma.user.count({ where: { role: "CUSTOMER" } });
  check("existing admin in postgres", adminsBefore >= 1);
  check("existing customer in postgres", customersBefore >= 1);

  const adminHashBefore = (
    await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { passwordHash: true } })
  )?.passwordHash;

  const adminRes = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const adminBody = adminRes.data as { user?: Record<string, unknown> };
  check("existing admin can login", adminRes.ok && adminBody.user?.role === "ADMIN", String(adminRes.status));
  check("admin response has no passwordHash", !("passwordHash" in (adminBody.user || {})));
  const adminCookie = cookieFrom(adminRes.res);

  const adminMe = await api("/api/auth/me", { headers: { Cookie: adminCookie } });
  const adminMeBody = adminMe.data as { user?: { role?: string } };
  check("admin session works", adminMeBody.user?.role === "ADMIN");

  const customerAsAdmin = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  check("unknown account cannot use admin login", customerAsAdmin.status === 401);

  await ensureAdminUser();
  await ensureAdminUser();
  const adminsAfter = await prisma.user.count({ where: { role: "ADMIN" } });
  const adminHashAfter = (
    await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { passwordHash: true } })
  )?.passwordHash;
  check("ensureAdmin does not duplicate admin", adminsAfter === adminsBefore && adminsBefore === 1);
  check("existing admin password is not overwritten", Boolean(adminHashBefore) && adminHashBefore === adminHashAfter);

  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E3 Test User",
      email,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  const regBody = reg.data as {
    ok?: boolean;
    user?: { id: string; emailVerified: boolean };
    verifyUrl?: string;
  };
  check(
    "register creates customer",
    reg.ok && Boolean(regBody.verifyUrl) && regBody.user?.emailVerified === false,
    String(reg.status),
  );
  const userId = regBody.user?.id || "";
  let verifyUrl = String(regBody.verifyUrl || "");
  let verifyToken = verifyUrl.split("token=")[1] || "";

  const pgAfterReg = await prisma.user.findUnique({ where: { email } });
  check("user created in PostgreSQL", Boolean(pgAfterReg && pgAfterReg.role === "CUSTOMER"));
  check("password stored as bcrypt hash", Boolean(pgAfterReg?.passwordHash.startsWith("$2")));

  const tokensAfterReg = await prisma.authToken.findMany({ where: { userId } });
  check("auth token stored in PostgreSQL", tokensAfterReg.length >= 1);
  check(
    "raw tokens are never stored",
    tokensAfterReg.every((t) => t.tokenHash !== verifyToken && t.tokenHash.length === 64),
  );

  const dupEmail = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E3 Test User",
      email,
      phone: phone2,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  check("duplicate email rejected", dupEmail.status === 409);

  const dupPhone = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "E3 Test User",
      email: email2,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  check("duplicate phone rejected", dupPhone.status === 409);

  const unverifiedLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  check("unverified customer cannot login", unverifiedLogin.status === 403);

  const resend = await api("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const resendBody = resend.data as { verifyUrl?: string };
  check("resend verification works", resend.ok && Boolean(resendBody.verifyUrl));
  const oldVerifyToken = verifyToken;
  verifyUrl = String(resendBody.verifyUrl || "");
  verifyToken = verifyUrl.split("token=")[1] || "";
  const oldVerify = await api("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: oldVerifyToken }),
  });
  check("replaced verify token is rejected", !oldVerify.ok);

  const verify = await api("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verifyToken }),
  });
  check("email verification works", verify.ok);

  const reuse = await api("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verifyToken }),
  });
  check("used verify token cannot be reused", !reuse.ok);

  const badPass = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password: "WrongPass1" }),
  });
  check("incorrect password rejected", badPass.status === 401);

  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginBody = login.data as { user?: Record<string, unknown> };
  check("existing customer can login", login.ok && loginBody.user?.role === "CUSTOMER");
  check("login response has no passwordHash", !("passwordHash" in (loginBody.user || {})));
  const customerCookie = cookieFrom(login.res);
  check("session created in PostgreSQL", (await prisma.session.count({ where: { userId } })) >= 1);

  const me = await api("/api/auth/me", { headers: { Cookie: customerCookie } });
  const meBody = me.data as { user?: { role?: string; email?: string } };
  check("/api/auth/me works", Boolean(meBody.user?.email) && meBody.user?.role === "CUSTOMER");
  const meAgain = await api("/api/auth/me", { headers: { Cookie: customerCookie } });
  check("existing session works", (meAgain.data as { user?: { role?: string } }).user?.role === "CUSTOMER");

  const customerAdmin = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  check("customer cannot use admin login", customerAdmin.status === 401);

  const customerOnAdminApi = await api("/api/admin/overview", { headers: { Cookie: customerCookie } });
  check("customer session cannot authenticate as admin", customerOnAdminApi.status === 403);

  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { status: "DISABLED" } });
    const disabled = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: email, password }),
    });
    check("disabled user cannot authenticate", disabled.status === 403);
    await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  }

  const sessionsBeforeReset = await prisma.session.count({ where: { userId } });
  const resetToken = await issueAuthToken(userId, "RESET_PASSWORD", 1);
  const reset = await api("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: resetToken,
      password: "E3TestPass2",
      confirmPassword: "E3TestPass2",
    }),
  });
  check("reset password works", reset.ok);
  const sessionsAfterReset = await prisma.session.count({ where: { userId } });
  check("reset invalidates sessions", sessionsBeforeReset >= 1 && sessionsAfterReset === 0);

  const reuseReset = await api("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: resetToken,
      password: "E3TestPass3",
      confirmPassword: "E3TestPass3",
    }),
  });
  check("used reset token cannot be reused", !reuseReset.ok);

  const expiredToken = await issueAuthToken(userId, "RESET_PASSWORD", 0);
  await new Promise((r) => setTimeout(r, 50));
  const expired = await api("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: expiredToken,
      password: "E3TestPass4",
      confirmPassword: "E3TestPass4",
    }),
  });
  check("expired auth token is rejected", !expired.ok);

  const loginAfterReset = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password: "E3TestPass2" }),
  });
  check("login works with new password", loginAfterReset.ok);
  const newCookie = cookieFrom(loginAfterReset.res);

  const forgot = await api("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const forgotUnknown = await api("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: "nobody.e3@dandy.test" }),
  });
  const forgotBody = forgot.data as { message?: string };
  const forgotUnknownBody = forgotUnknown.data as { message?: string };
  check(
    "forgot password generic success",
    forgot.ok &&
      forgotUnknown.ok &&
      Boolean(forgotBody.message) &&
      forgotBody.message === forgotUnknownBody.message,
  );

  const logout = await api("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: newCookie },
  });
  check("logout works", logout.ok);
  const sessionsAfterLogout = await prisma.session.count({
    where: { userId, expiresAt: { gt: new Date() } },
  });
  check("session deleted on logout", sessionsAfterLogout === 0);

  const meAfter = await api("/api/auth/me", { headers: { Cookie: newCookie } });
  const meAfterBody = meAfter.data as { user?: unknown };
  check("me is empty after logout", meAfterBody.user == null);

  const customersAfter = await prisma.user.count({ where: { role: "CUSTOMER" } });
  check("original customer records kept", customersAfter === customersBefore + 1);

  const jsonAfter = jsonHash();
  check("dandy.json unchanged by auth tests", jsonBefore === jsonAfter);

  const failed = results.filter((r) => !r.ok);
  console.log("SUMMARY:passed=" + (results.length - failed.length) + ",failed=" + failed.length);
  if (failed.length) {
    console.log("FAILED_NAMES:" + failed.map((f) => f.name).join(" | "));
    process.exitCode = 1;
  }
}

main()
  .catch((err: unknown) => {
    console.error("E3_TEST_FAILED");
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(msg.replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
