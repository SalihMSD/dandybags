import { createSession } from "@/lib/auth/session";
import { ensureAdmin, jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { isValidEmail, normalizeEmail, normalizePhone } from "@/lib/auth/validate";
import { verifyPassword } from "@/lib/db/password";
import { publicUser } from "@/lib/db/store";
import { mergeGuestCart } from "@/lib/db/cart";
import { findCustomerByEmailOrPhone, touchLastLogin } from "@/lib/db/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await ensureAdmin();
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "login"), 10, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const identifier = String(body.identifier || body.email || "").trim();
  const password = String(body.password || "");
  if (!identifier || !password) {
    return jsonError("Invalid email/mobile number or password.", 401);
  }

  const email = isValidEmail(identifier) ? normalizeEmail(identifier) : "";
  const phone = normalizePhone(identifier);
  const user = await findCustomerByEmailOrPhone(email, phone);
  if (user?.role === "ADMIN") {
    return jsonError("Admin accounts sign in at /admin/login.", 401);
  }
  if (!user || user.role !== "CUSTOMER") return jsonError("Invalid email/mobile number or password.", 401);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return jsonError("Invalid email/mobile number or password.", 401);
  if (user.status !== "ACTIVE") return jsonError("This account is not available.", 403);
  if (!user.emailVerified) {
    return jsonError("Please verify your email before logging in.", 403);
  }

  await touchLastLogin(user.id);

  try {
    await mergeGuestCart(user.id, body.guestCart);
  } catch {
    /* Existing PostgreSQL cart is unchanged if merge rolls back. */
  }

  await createSession(user.id, user.role);
  return Response.json({ ok: true, user: publicUser(user) });
}
