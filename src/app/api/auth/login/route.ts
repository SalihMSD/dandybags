import { createSession } from "@/lib/auth/session";
import { ensureAdmin, jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { isValidEmail, normalizeEmail, normalizePhone } from "@/lib/auth/validate";
import { verifyPassword } from "@/lib/db/password";
import { nowIso, publicUser, readStore, updateStore, type CartItemRecord } from "@/lib/db/store";

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

  const store = readStore();
  const email = isValidEmail(identifier) ? normalizeEmail(identifier) : "";
  const phone = normalizePhone(identifier);
  const user = store.users.find((u) => (email && u.email === email) || u.phone === phone);
  if (user?.role === "ADMIN") {
    return jsonError("Admin accounts sign in at /admin/login.", 401);
  }
  if (!user || user.role !== "CUSTOMER") return jsonError("Invalid email/mobile number or password.", 401);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return jsonError("Invalid email/mobile number or password.", 401);
  if (user.status !== "ACTIVE") return jsonError("This account is not available.", 403);
  if (user.role === "CUSTOMER" && !user.emailVerified) {
    return jsonError("Please verify your email before logging in.", 403);
  }

  await updateStore((s) => {
    const row = s.users.find((u) => u.id === user.id);
    if (row) {
      row.lastLoginAt = nowIso();
      row.updatedAt = nowIso();
    }
    const guest = Array.isArray(body.guestCart) ? (body.guestCart as CartItemRecord[]) : [];
    if (guest.length && user.role === "CUSTOMER") {
      let cart = s.carts.find((c) => c.userId === user.id);
      if (!cart) {
        cart = { userId: user.id, items: [], updatedAt: nowIso() };
        s.carts.push(cart);
      }
      for (const item of guest) {
        if (!item?.sku || !item.qty) continue;
        const existing = cart.items.find((i) => i.sku === item.sku);
        if (existing) existing.qty += Number(item.qty) || 1;
        else
          cart.items.push({
            sku: String(item.sku),
            slug: String(item.slug || ""),
            name: String(item.name || ""),
            qty: Number(item.qty) || 1,
            image: String(item.image || ""),
          });
      }
      cart.updatedAt = nowIso();
    }
  });

  await createSession(user.id, user.role);
  return Response.json({ ok: true, user: publicUser(user) });
}
