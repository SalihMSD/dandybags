import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { addWishlistItem, listWishlist, removeWishlistItem } from "@/lib/db/wishlist";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const items = await listWishlist(user.id);
    return Response.json({ items });
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

  const sku = String(body.sku || "");
  const result = await addWishlistItem(user.id, sku);
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
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

  const sku = String(body.sku || "");
  await removeWishlistItem(user.id, sku);
  return Response.json({ ok: true });
}
