import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/auth/validate";
import { nowIso, publicUser, readStore, updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const row = readStore().users.find((u) => u.id === user.id);
    if (!row) return jsonError("UNAUTHORIZED", 401);
    return Response.json({ user: publicUser(row) });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function PUT(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const auth = await requireCustomer();
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = String(body.fullName || "").trim();
    const email = normalizeEmail(String(body.email || ""));
    const phone = normalizePhone(String(body.phone || ""));
    if (fullName.length < 2) return jsonError("Please enter your full name.", 400);
    if (!isValidEmail(email)) return jsonError("Please enter a valid email address.", 400);
    if (!isValidPhone(phone)) return jsonError("Please enter a valid 10-digit mobile number.", 400);

    const result = await updateStore((s) => {
      const user = s.users.find((u) => u.id === auth.id);
      if (!user) return { error: "Please log in." };
      if (s.users.some((u) => u.id !== auth.id && u.email === email)) {
        return { error: "An account already exists with this email." };
      }
      if (s.users.some((u) => u.id !== auth.id && u.phone === phone)) {
        return { error: "An account already exists with this mobile number." };
      }
      const emailChanged = user.email !== email;
      user.fullName = fullName;
      user.email = email;
      user.phone = phone;
      if (emailChanged) user.emailVerified = false;
      user.updatedAt = nowIso();
      return { user: publicUser(user), emailChanged };
    });
    if ("error" in result && result.error) return jsonError(result.error, 400);
    return Response.json(result);
  } catch {
    return jsonError("Please log in.", 401);
  }
}
