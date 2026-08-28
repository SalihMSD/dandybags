import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { listUserCoupons } from "@/lib/db/coupons";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const coupons = await listUserCoupons(user.id);
    return Response.json({ coupons });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
