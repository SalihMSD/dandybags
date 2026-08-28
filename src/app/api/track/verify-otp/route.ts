import { jsonError, originOk } from "@/lib/auth/helpers";
import { verifyOtp } from "@/lib/track";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const trackingId = String(body.trackingId || "").trim();
  const code = String(body.code || "").trim();

  if (!trackingId || !code) {
    return jsonError("Tracking ID and OTP are required.", 400);
  }

  const result = verifyOtp(trackingId, code);
  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  return Response.json({ ok: true, phone: result.phone });
}
