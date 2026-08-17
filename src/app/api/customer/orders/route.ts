import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { listCustomerOrders } from "@/lib/db/orders";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const orders = await listCustomerOrders(user.id);
    return Response.json({ orders });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
