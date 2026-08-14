import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { products } from "@/lib/products";
import { nowIso, readStore, updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const skus = readStore().wishlist.filter((w) => w.userId === user.id).map((w) => w.sku);
    const items = skus
      .map((sku) => products.find((p) => p.sku === sku))
      .filter(Boolean);
    return Response.json({ items });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const user = await requireCustomer();
    const body = (await request.json()) as { sku?: string };
    const sku = String(body.sku || "");
    if (!products.some((p) => p.sku === sku)) return jsonError("Product not found.", 404);
    await updateStore((s) => {
      if (!s.wishlist.some((w) => w.userId === user.id && w.sku === sku)) {
        s.wishlist.push({ userId: user.id, sku, addedAt: nowIso() });
      }
    });
    return Response.json({ ok: true });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function DELETE(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const user = await requireCustomer();
    const body = (await request.json()) as { sku?: string };
    const sku = String(body.sku || "");
    await updateStore((s) => {
      s.wishlist = s.wishlist.filter((w) => !(w.userId === user.id && w.sku === sku));
    });
    return Response.json({ ok: true });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
