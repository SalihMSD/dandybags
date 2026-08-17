import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { hashPassword, passwordIssues } from "@/lib/db/password";
import { hashToken } from "@/lib/db/store";
import { consumeResetToken, findAuthToken } from "@/lib/db/tokens";

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

  const row = await findAuthToken(hashToken(token), "RESET_PASSWORD");
  if (!row || row.usedAt) return jsonError("This reset link is not valid.", 400);
  if (row.expiresAt < new Date()) return jsonError("This reset link has expired.", 400);

  const passwordHash = await hashPassword(password);
  await consumeResetToken(row.id, row.userId, passwordHash);
  return Response.json({ ok: true });
}
