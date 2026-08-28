/**
 * Smoke-test staging deployment. Does not print secrets.
 * Usage: node scripts/_vercel-staging-verify.cjs <baseUrl>
 */
const base = (process.argv[2] || "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: node scripts/_vercel-staging-verify.cjs <baseUrl>");
  process.exit(1);
}

const checks = [];

async function check(name, ok) {
  checks.push({ name, ok });
  console.log((ok ? "PASS " : "FAIL ") + name);
}

async function main() {
  const home = await fetch(base + "/");
  check("homepage returns 200", home.status === 200);

  const me = await fetch(base + "/api/auth/me");
  check("API /api/auth/me reachable", me.status === 200 || me.status === 401);
  const meBody = await me.json().catch(() => ({}));
  check("API returns JSON", typeof meBody === "object");

  const stamp = String(Date.now()).slice(-8);
  const email = `e12c.${stamp}@dandy.test`;
  const phone = `97800${stamp.slice(-5)}`;
  const password = "E12cTestPass1";

  const reg = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "E12C Staging",
      email,
      phone,
      password,
      confirmPassword: password,
      terms: true,
    }),
  });
  check("customer register reaches DB", reg.status === 200 || reg.status === 201 || reg.status === 429);
  const regBody = await reg.json().catch(() => ({}));
  check("register response has no passwordHash", !("passwordHash" in (regBody.user || {})));

  const verifyUrl = String(regBody.verifyUrl || "");
  const token = verifyUrl.split("token=")[1] || "";
  if (token) {
    await fetch(base + "/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  }

  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  });
  check("customer login works", login.status === 200);
  const loginCookie = (login.headers.get("set-cookie") || "").includes("dandy_session");

  check("customer session cookie set", loginCookie);

  const adminLogin = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "",
      password: process.env.ADMIN_PASSWORD || "",
    }),
  });
  check("admin login endpoint reachable", adminLogin.status === 200 || adminLogin.status === 401 || adminLogin.status === 403);

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const { readFileSync, existsSync } = require("fs");
    const { resolve } = require("path");
    const envPath = resolve(__dirname, "..", ".env.local");
    if (existsSync(envPath)) {
      const env = {};
      for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq <= 0) continue;
        let v = t.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        env[t.slice(0, eq).trim()] = v;
      }
      const a = await fetch(base + "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
      });
      check("admin auth with staging credentials", a.status === 200);
      const adminCookie = (a.headers.get("set-cookie") || "").includes("dandy_session");
      check("admin session cookie set", adminCookie);
    }
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "verify failed");
  process.exit(1);
});
