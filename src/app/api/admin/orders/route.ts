import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminOrders } from "@/lib/db/admin-orders";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  try {
    const orders = await listAdminOrders();
    return Response.json({ orders });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
