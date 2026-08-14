import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { publicUser, readStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const store = readStore();
    const customers = store.users.filter((u) => u.role === "CUSTOMER").map(publicUser);
    return Response.json({
      customers,
      orders: store.orders,
      counts: {
        customers: customers.length,
        orders: store.orders.length,
        addresses: store.addresses.length,
      },
    });
  } catch {
    return jsonError("Access denied.", 403);
  }
}
