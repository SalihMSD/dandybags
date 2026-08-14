import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { passwordIssues } from "@/lib/db/password";
import { hashPassword } from "@/lib/db/password";
import { hashToken, nowIso, readStore, updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "reset"), 8, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }
  const token = String(body.token || "");
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  if (!token) return jsonError("This reset link is not valid.", 400);
  if (password !== confirmPassword) return jsonError("Passwords do not match.", 400);
  const pwdErr = passwordIssues(password);
  if (pwdErr) return jsonError(pwdErr, 400);

  const tokenHash = hashToken(token);
  const store = readStore();
  const row = store.tokens.find((t) => t.tokenHash === tokenHash && t.type === "RESET_PASSWORD");
  if (!row || row.usedAt) return jsonError("This reset link is not valid.", 400);
  if (new Date(row.expiresAt) < new Date()) return jsonError("This reset link has expired.", 400);

  const passwordHash = await hashPassword(password);
  await updateStore((s) => {
    const tok = s.tokens.find((t) => t.id === row.id);
    const user = s.users.find((u) => u.id === row.userId);
    if (tok) tok.usedAt = nowIso();
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = nowIso();
    }
    s.sessions = s.sessions.filter((x) => x.userId !== row.userId);
  });
  return Response.json({ ok: true });
}
