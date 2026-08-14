import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { PRICE_PLACEHOLDER } from "@/lib/site";
import { newId, nowIso, readStore, updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const user = await requireCustomer();
    const body = (await request.json()) as { addressId?: string };
    const store = readStore();
    const address = store.addresses.find((a) => a.id === body.addressId && a.userId === user.id);
    if (!address) return jsonError("Please select a delivery address.", 400);
    const cart = store.carts.find((c) => c.userId === user.id);
    if (!cart?.items.length) return jsonError("Your cart is empty.", 400);

    const order = await updateStore((s) => {
      const items = s.carts.find((c) => c.userId === user.id)?.items ?? [];
      const row = {
        id: `DND-${newId("ord").slice(-8).toUpperCase()}`,
        userId: user.id,
        items: [...items],
        totalLabel: PRICE_PLACEHOLDER,
        paymentStatus: "PENDING" as const,
        orderStatus: "PLACED" as const,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          landmark: address.landmark,
        },
        createdAt: nowIso(),
      };
      s.orders.push(row);
      const c = s.carts.find((x) => x.userId === user.id);
      if (c) {
        c.items = [];
        c.updatedAt = nowIso();
      }
      return row;
    });
    return Response.json({ ok: true, order });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
