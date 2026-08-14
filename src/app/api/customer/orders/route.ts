import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { readStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const orders = readStore()
      .orders.filter((o) => o.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Response.json({ orders });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
