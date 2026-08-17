import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { hashToken } from "@/lib/db/store";
import { consumeVerifyToken, findAuthToken } from "@/lib/db/tokens";

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

  const row = await findAuthToken(hashToken(token), "VERIFY_EMAIL");
  if (!row || row.usedAt) return jsonError("This verification link is not valid.", 400);
  if (row.expiresAt < new Date()) return jsonError("This verification link has expired.", 400);

  await consumeVerifyToken(row.id, row.userId);
  return Response.json({ ok: true });
}
