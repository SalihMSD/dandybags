import { jsonError } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { listCustomerReturns } from "@/lib/db/returns";

export const runtime = "nodejs";

export async function GET(_request: Request) {
  try {
    const user = await requireCustomer();
    const returns = await listCustomerReturns(user.id);
    return Response.json({ returns });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
