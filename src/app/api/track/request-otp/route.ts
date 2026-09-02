import { jsonError, originOk } from "@/lib/auth/helpers";
import { requestOtp } from "@/lib/track";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const phone = String(body.phone || "").trim();
  const result = requestOtp(phone);
  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  return Response.json({
    ok: true,
    trackingId: result.trackingId,
    expiresAt: result.expiresAt,
  });
}
