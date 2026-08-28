import { jsonError } from "@/lib/auth/helpers";
import { listFeaturedProducts } from "@/lib/db/products";

export const runtime = "nodejs";

export async function GET() {
  try {
    const products = await listFeaturedProducts(8);
    return Response.json({ products });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
