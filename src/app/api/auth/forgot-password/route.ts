import { issueToken, sendResetEmail } from "@/lib/auth/mail";
import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { isValidEmail, normalizeEmail } from "@/lib/auth/validate";
import { readStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "forgot"), 5, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }
  const email = normalizeEmail(String(body.email || ""));
  const message = "If an account exists with this email, a password reset link has been sent.";
  if (isValidEmail(email)) {
    const user = readStore().users.find((u) => u.email === email && u.role === "CUSTOMER");
    if (user) {
      const token = await issueToken(user.id, "RESET_PASSWORD", 1);
      await sendResetEmail(user, token);
    }
  }
  return Response.json({ ok: true, message });
}
