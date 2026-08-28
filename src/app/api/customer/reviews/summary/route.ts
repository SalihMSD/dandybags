import { jsonError, originOk } from "@/lib/auth/helpers";
import { getReviewSummary } from "@/lib/db/reviews";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productSku = searchParams.get("productSku");

  if (!productSku) {
    return jsonError("productSku is required.", 400);
  }

  try {
    const summary = await getReviewSummary(productSku);
    if (!summary) {
      return jsonError("Product not found.", 404);
    }
    return Response.json(summary);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
