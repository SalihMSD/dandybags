import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { listCustomerOrders } from "@/lib/db/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await requireCustomer();
    const orders = await listCustomerOrders(user.id);
    return Response.json({ orders }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
