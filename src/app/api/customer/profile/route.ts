import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/auth/validate";
import { publicUser } from "@/lib/db/store";
import { findUserById, updateCustomerProfile } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireCustomer();
    const row = await findUserById(auth.id);
    if (!row || row.role !== "CUSTOMER") return jsonError("Please log in.", 401);
    return Response.json({ user: publicUser(row) });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function PUT(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  let auth: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    auth = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const fullName = String(body.fullName || "").trim();
  const email = normalizeEmail(String(body.email || ""));
  const phone = normalizePhone(String(body.phone || ""));
  if (fullName.length < 2) return jsonError("Please enter your full name.", 400);
  if (!isValidEmail(email)) return jsonError("Please enter a valid email address.", 400);
  if (!isValidPhone(phone)) return jsonError("Please enter a valid 10-digit mobile number.", 400);

  const result = await updateCustomerProfile(auth.id, { fullName, email, phone });
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ user: publicUser(result.user), emailChanged: result.emailChanged });
}
