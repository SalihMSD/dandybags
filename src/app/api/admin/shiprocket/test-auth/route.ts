import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { authenticate, clearTokenCache } from "@/lib/shiprocket/client";
import { normalizeShiprocketError } from "@/lib/shiprocket/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/admin/shiprocket/test-auth
 *
 * Safely tests Shiprocket API authentication.
 * Returns only success/failure and a sanitized error — never the token or credentials.
 * Clears the token cache first so a fresh authentication attempt is always made.
 */
export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  // Force a fresh attempt — ignore any cached token
  clearTokenCache();

  const emailConfigured = Boolean(process.env.SHIPROCKET_EMAIL?.trim());
  const passwordConfigured = Boolean(process.env.SHIPROCKET_PASSWORD?.trim());
  const pickupConfigured = Boolean(process.env.SHIPROCKET_PICKUP_LOCATION?.trim());

  if (!emailConfigured || !passwordConfigured) {
    return Response.json({
      ok: false,
      shiprocketStatus: null,
      error: "SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD is not set.",
      config: {
        emailConfigured,
        passwordConfigured,
        pickupConfigured,
        emailMasked: emailConfigured
          ? maskEmail(process.env.SHIPROCKET_EMAIL!)
          : null,
      },
    });
  }

  let shiprocketStatus: number | null = null;
  try {
    // authenticate() throws on non-2xx; we only capture the token existence
    await authenticate();
    return Response.json({
      ok: true,
      shiprocketStatus: 200,
      error: null,
      config: {
        emailConfigured,
        passwordConfigured,
        pickupConfigured,
        emailMasked: maskEmail(process.env.SHIPROCKET_EMAIL!),
      },
    });
  } catch (err) {
    // Extract HTTP status from ShiprocketAuthError if available
    if (err && typeof err === "object" && "statusCode" in err) {
      shiprocketStatus = (err as { statusCode?: number }).statusCode ?? null;
    }
    const sanitized = err instanceof Error
      ? normalizeShiprocketError(err.message)
      : "Unknown error";

    return Response.json({
      ok: false,
      shiprocketStatus,
      error: sanitized,
      config: {
        emailConfigured,
        passwordConfigured,
        pickupConfigured,
        emailMasked: maskEmail(process.env.SHIPROCKET_EMAIL!),
      },
    });
  }
}

/** Masks an email address: e.g. salihforinmakes1210@gmail.com → s***@gmail.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "[invalid-email]";
  return `${local[0]}***@${domain}`;
}
