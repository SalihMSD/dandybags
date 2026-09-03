import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { verifyOtpAndLogin } from "@/lib/auth/otp-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "otp-verify"), 5, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const idToken = String(body.idToken || "").trim();
  if (!idToken) {
    return jsonError("Invalid OTP or phone number.", 401);
  }

  const result = await verifyOtpAndLogin(idToken, body.guestCart);
  if (!result.ok) {
    return jsonError(result.error || "Invalid OTP or phone number.", 401);
  }

  return Response.json({ ok: true, user: result.user });
}
