import { issueToken, sendVerifyEmail, smtpConfigured } from "@/lib/auth/mail";
import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { isValidEmail, normalizeEmail, normalizePhone } from "@/lib/auth/validate";
import { findCustomerByEmailOrPhone } from "@/lib/db/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "resend"), 5, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }
  const raw = String(body.email || body.identifier || "");
  const email = normalizeEmail(raw);
  const phone = normalizePhone(raw);
  const generic = { ok: true as const };
  const user = await findCustomerByEmailOrPhone(
    isValidEmail(email) ? email : "",
    phone,
  );
  if (user && user.role === "CUSTOMER" && !user.emailVerified) {
    const token = await issueToken(user.id, "VERIFY_EMAIL", 24);
    const url = await sendVerifyEmail(user, token);
    return Response.json({
      ok: true,
      verifyUrl: smtpConfigured() ? undefined : url,
    });
  }
  return Response.json(generic);
}
