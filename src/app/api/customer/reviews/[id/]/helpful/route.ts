import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { toggleHelpful } from "@/lib/db/reviews";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  try {
    await requireCustomer();
  } catch {
    return jsonError("Please log in to vote.", 401);
  }

  const reviewId = String(body.reviewId || "").trim();
  const userId = (await requireCustomer()).id;

  if (!reviewId) {
    return jsonError("reviewId is required.", 400);
  }

  const result = await toggleHelpful(reviewId, userId);
  return Response.json(result);
}
