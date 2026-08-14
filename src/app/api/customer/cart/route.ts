import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { nowIso, readStore, updateStore, type CartItemRecord } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const cart = readStore().carts.find((c) => c.userId === user.id);
    return Response.json({ items: cart?.items ?? [] });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function PUT(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const user = await requireCustomer();
    const body = (await request.json()) as { items?: CartItemRecord[] };
    const items = Array.isArray(body.items) ? body.items : [];
    const saved = await updateStore((s) => {
      let cart = s.carts.find((c) => c.userId === user.id);
      if (!cart) {
        cart = { userId: user.id, items: [], updatedAt: nowIso() };
        s.carts.push(cart);
      }
      cart.items = items
        .filter((i) => i?.sku && Number(i.qty) > 0)
        .map((i) => ({
          sku: String(i.sku),
          slug: String(i.slug || ""),
          name: String(i.name || ""),
          qty: Number(i.qty) || 1,
          image: String(i.image || ""),
        }));
      cart.updatedAt = nowIso();
      return cart.items;
    });
    return Response.json({ items: saved });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
