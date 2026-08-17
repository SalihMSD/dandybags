import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { deleteAddress, parseAddressBody, updateAddress } from "@/lib/db/addresses";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const parsed = parseAddressBody(body);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  try {
    const result = await updateAddress(user.id, id, parsed);
    if (!result.ok) return jsonError(result.error, 404);
    return Response.json(result);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  const { id } = await ctx.params;
  try {
    const addresses = await deleteAddress(user.id, id);
    return Response.json({ addresses });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
