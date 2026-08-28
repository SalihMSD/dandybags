import { jsonError } from "@/lib/auth/helpers";
import { listProductsByCategory } from "@/lib/db/products";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  try {
    const products = await listProductsByCategory(slug);
    return Response.json({ products, total: products.length });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
