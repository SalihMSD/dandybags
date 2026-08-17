import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { createAddress, listAddresses, parseAddressBody } from "@/lib/db/addresses";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const addresses = await listAddresses(user.id);
    return Response.json({ addresses });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const parsed = parseAddressBody(body);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  try {
    const addresses = await createAddress(user.id, parsed);
    return Response.json({ addresses });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
