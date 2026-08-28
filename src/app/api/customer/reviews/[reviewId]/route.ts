import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { updateReview } from "@/lib/db/reviews";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
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
    return jsonError("Please log in.", 401);
  }

  const { reviewId } = await ctx.params;
  const rating = Number(body.rating);
  const title = String(body.title || "").trim();
  const comment = String(body.comment || "").trim();

  if (!rating || !title || !comment) {
    return jsonError("All fields are required.", 400);
  }

  const result = await updateReview(reviewId, user.id, { rating, title, comment });

  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  return Response.json({ ok: true });
}
