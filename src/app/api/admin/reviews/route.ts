import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAllReviewsForAdmin, updateReviewStatus, deleteReview } from "@/lib/db/reviews";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || "20")));
  const status = searchParams.get("status") || undefined;

  try {
    const result = await getAllReviewsForAdmin(page, pageSize, status);
    return Response.json(result);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const reviewId = String(body.reviewId || "").trim();
  const status = String(body.status || "").trim() as "APPROVED" | "HIDDEN";

  if (!reviewId || !status) {
    return jsonError("reviewId and status are required.", 400);
  }

  if (!["APPROVED", "HIDDEN"].includes(status)) {
    return jsonError("Invalid status.", 400);
  }

  try {
    const result = await updateReviewStatus(reviewId, status);
    return Response.json(result);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const reviewId = String(body.reviewId || "").trim();
  if (!reviewId) {
    return jsonError("reviewId is required.", 400);
  }

  try {
    const result = await deleteReview(reviewId);
    return Response.json(result);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
