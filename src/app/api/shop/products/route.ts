import { jsonError } from "@/lib/auth/helpers";
import {
  listPublicProducts,
  getPublicProductBySlug,
  listFeaturedProducts,
  listNewArrivals,
  listProductsByCategory,
} from "@/lib/db/products";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const featured = searchParams.get("featured") === "true" ? true : searchParams.get("featured") === "false" ? false : undefined;
  const search = searchParams.get("search") || undefined;
  const b2cAvailable = searchParams.get("b2cAvailable") === "true" ? true : searchParams.get("b2cAvailable") === "false" ? false : undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || "20")));
  const sort = (searchParams.get("sort") || "newest") as "newest" | "price-asc" | "price-desc" | "featured";

  try {
    const result = await listPublicProducts({
      category,
      featured,
      search,
      b2cAvailable,
      page,
      pageSize,
      sort,
    });
    return Response.json(result);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
