import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { hashToken, nowIso, readStore, updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "verify"), 20, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }
  const token = String(body.token || "");
  if (!token) return jsonError("This verification link is not valid.", 400);

  const tokenHash = hashToken(token);
  const store = readStore();
  const row = store.tokens.find((t) => t.tokenHash === tokenHash && t.type === "VERIFY_EMAIL");
  if (!row || row.usedAt) return jsonError("This verification link is not valid.", 400);
  if (new Date(row.expiresAt) < new Date()) return jsonError("This verification link has expired.", 400);

  await updateStore((s) => {
    const tok = s.tokens.find((t) => t.id === row.id);
    const user = s.users.find((u) => u.id === row.userId);
    if (tok) tok.usedAt = nowIso();
    if (user) {
      user.emailVerified = true;
      user.updatedAt = nowIso();
    }
  });
  return Response.json({ ok: true });
}
