import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { getApprovedReviews, createReview } from "@/lib/db/reviews";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productSku = searchParams.get("productSku");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(20, Math.max(1, Number(searchParams.get("pageSize") || "10")));
  const sort = (searchParams.get("sort") || "newest") as "newest" | "highest" | "lowest" | "helpful";

  if (!productSku) {
    return jsonError("productSku is required.", 400);
  }

  try {
    const result = await getApprovedReviews(productSku, page, pageSize, sort);
    return Response.json(result);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function POST(request: Request) {
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

  const productSku = String(body.productSku || "").trim();
  const rating = Number(body.rating);
  const title = String(body.title || "").trim();
  const comment = String(body.comment || "").trim();

  if (!productSku || !rating || !title || !comment) {
    return jsonError("All fields are required.", 400);
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
