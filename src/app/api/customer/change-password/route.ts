import { jsonError, originOk } from "@/lib/auth/helpers";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { hashPassword, passwordIssues, verifyPassword } from "@/lib/db/password";
import { setPasswordHash } from "@/lib/db/users";
import { destroySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { requireCustomer } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  const limited = rateLimit(clientKey(request, "change-password"), 5, 15 * 60 * 1000);
  if (!limited.ok) return jsonError("Too many attempts. Please try again later.", 429);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return jsonError("All fields are required.", 400);
  }
  if (newPassword !== confirmPassword) {
    return jsonError("New passwords do not match.", 400);
  }

  const pwdErr = passwordIssues(newPassword);
  if (pwdErr) return jsonError(pwdErr, 400);

  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const fullUser = await findUserById(user.id);
  if (!fullUser || fullUser.role !== "CUSTOMER") {
    return jsonError("Please log in.", 401);
  }

  const currentValid = await verifyPassword(currentPassword, fullUser.passwordHash);
  if (!currentValid) {
    return jsonError("Current password is incorrect.", 400);
  }

  if (newPassword === currentPassword) {
    return jsonError("New password must be different from your current password.", 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await setPasswordHash(fullUser.id, passwordHash);

  try {
    await prisma.session.deleteMany({ where: { userId: fullUser.id } });
  } catch {
    /* Best-effort session cleanup; DB update already succeeded. */
  }

  try {
    await destroySession();
  } catch {
    /* Cookie cleanup is best-effort after DB update. */
  }

  return Response.json({ ok: true });
}
