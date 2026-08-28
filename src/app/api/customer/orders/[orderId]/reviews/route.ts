import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { getOrderReviewStatus, createReview, getCustomerReview, updateReview } from "@/lib/db/reviews";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireCustomer();
    const { orderId } = await ctx.params;
    const status = await getOrderReviewStatus(user.id, orderId);
    if (!status) return jsonError("Order not found or not eligible for reviews.", 404);
    return Response.json(status);
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("Please log in to write a review.", 401);
  }

  const { orderId } = await ctx.params;
  const productSku = String(body.productSku || "").trim();
  const rating = Number(body.rating);
  const title = String(body.title || "").trim();
  const comment = String(body.comment || "").trim();

  if (!productSku || !rating || !title || !comment) {
    return jsonError("All fields are required.", 400);
  }

  const orderStatus = await getOrderReviewStatus(user.id, orderId);
  if (!orderStatus) {
    return jsonError("Order not found or not eligible for reviews.", 404);
  }

  const itemStatus = orderStatus.items.find((i) => i.sku === productSku);
  if (!itemStatus) {
    return jsonError("Product not found in this order.", 404);
  }

  if (itemStatus.reviewStatus !== "NOT_REVIEWED") {
    return jsonError("You have already reviewed this product.", 400);
  }

  const result = await createReview({
    productSku,
    userId: user.id,
    rating,
    title,
    comment,
  });

  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  return Response.json({ ok: true, reviewId: result.reviewId }, { status: 201 });
}
