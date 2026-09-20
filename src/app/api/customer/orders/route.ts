import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { listCustomerOrders } from "@/lib/db/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  try {
    const orders = await listCustomerOrders(user.id);
    return Response.json({ orders }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[DANDY api] failed to list customer orders", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError("Unable to load orders at this time. Please try again later.", 500);
  }
}
