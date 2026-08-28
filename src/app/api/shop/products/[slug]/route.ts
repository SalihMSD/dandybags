import { jsonError } from "@/lib/auth/helpers";
import { getPublicProductBySlug } from "@/lib/db/products";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  try {
    const product = await getPublicProductBySlug(slug);
    if (!product) return jsonError("Product not found.", 404);
    return Response.json({ product });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
