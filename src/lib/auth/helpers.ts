import { hashPassword } from "@/lib/db/password";
import { newId, nowIso, readStore, updateStore } from "@/lib/db/store";
import { normalizeEmail } from "@/lib/auth/validate";

export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = readStore().users.find((u) => u.role === "ADMIN" && u.email === normalizeEmail(email));
  if (existing) return;
  const passwordHash = await hashPassword(password);
  await updateStore((s) => {
    if (s.users.some((u) => u.role === "ADMIN" && u.email === normalizeEmail(email))) return;
    const t = nowIso();
    s.users.push({
      id: newId("usr"),
      fullName: "DANDY Admin",
      email: normalizeEmail(email),
      phone: "9000000000",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      createdAt: t,
      updatedAt: t,
      lastLoginAt: null,
    });
  });
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function originOk(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
