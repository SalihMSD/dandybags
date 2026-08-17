import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerCart, replaceCustomerCart } from "@/lib/db/cart";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCustomer();
    const cart = await getCustomerCart(user.id);
    return Response.json(cart);
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function PUT(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  let user: Awaited<ReturnType<typeof requireCustomer>>;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in.", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  try {
    const cart = await replaceCustomerCart(user.id, body.items);
    return Response.json(cart);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
