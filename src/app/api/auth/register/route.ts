import { issueToken, sendVerifyEmail, smtpConfigured } from "@/lib/auth/mail";
import { ensureAdmin, jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone, registerIssues } from "@/lib/auth/validate";
import { hashPassword, passwordIssues } from "@/lib/db/password";
import { newId, nowIso, publicUser, readStore, updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await ensureAdmin();
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "register"), 8, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const fullName = String(body.fullName || "");
  const email = normalizeEmail(String(body.email || ""));
  const phone = normalizePhone(String(body.phone || ""));
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  const terms = Boolean(body.terms);

  const formErr = registerIssues({ fullName, email, phone, password, confirmPassword, terms });
  if (formErr) return jsonError(formErr, 400);
  if (!isValidEmail(email) || !isValidPhone(phone)) {
    return jsonError("Please check your email and mobile number.", 400);
  }
  const pwdErr = passwordIssues(password);
  if (pwdErr) return jsonError(pwdErr, 400);

  const store = readStore();
  if (store.users.some((u) => u.email === email)) {
    return jsonError("An account already exists with this email.", 409);
  }
  if (store.users.some((u) => u.phone === phone)) {
    return jsonError("An account already exists with this mobile number.", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await updateStore((s) => {
    if (s.users.some((u) => u.email === email || u.phone === phone)) return null;
    const t = nowIso();
    const row = {
      id: newId("usr"),
      fullName: fullName.trim(),
      email,
      phone,
      passwordHash,
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      emailVerified: false,
      createdAt: t,
      updatedAt: t,
      lastLoginAt: null,
    };
    s.users.push(row);
    return row;
  });
  if (!user) return jsonError("An account already exists with this email.", 409);

  const token = await issueToken(user.id, "VERIFY_EMAIL", 24);
  const url = await sendVerifyEmail(user, token);
  return Response.json({
    ok: true,
    user: publicUser(user),
    verifyUrl: smtpConfigured() ? undefined : url,
  });
}
