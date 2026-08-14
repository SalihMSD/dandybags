import { ensureAdmin, jsonError, originOk } from "@/lib/auth/helpers";
import { createSession } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { normalizeEmail } from "@/lib/auth/validate";
import { verifyPassword } from "@/lib/db/password";
import { nowIso, publicUser, readStore, updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await ensureAdmin();
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "admin-login"), 8, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const user = readStore().users.find((u) => u.email === email && u.role === "ADMIN");
  if (!user) return jsonError("Invalid email/mobile number or password.", 401);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return jsonError("Invalid email/mobile number or password.", 401);
  if (user.status !== "ACTIVE") return jsonError("This account is not available.", 403);

  await updateStore((s) => {
    const row = s.users.find((u) => u.id === user.id);
    if (row) row.lastLoginAt = nowIso();
  });
  await createSession(user.id, "ADMIN");
  return Response.json({ ok: true, user: publicUser(user) });
}
