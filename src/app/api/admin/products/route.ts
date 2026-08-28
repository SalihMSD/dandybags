import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminProducts, createAdminProduct, findProductBySku, findProductBySlug } from "@/lib/db/admin-products";
import { newId } from "@/lib/db/store";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

async function revalidateProductPaths(category?: string, slug?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/categories");
  if (category) revalidatePath(`/categories/${category}`);
  if (slug) revalidatePath(`/shop/${slug}`);
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  try {
    const products = await listAdminProducts();
    return Response.json({ products });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function POST(request: Request) {
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
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const name = String(body.name || "").trim();
  const sku = String(body.sku || "").trim();
  const slug = String(body.slug || "").trim();
  const category = String(body.category || "").trim();
  const subcategory = String(body.subcategory || "").trim();
  const sellingPrice = body.sellingPrice !== undefined && body.sellingPrice !== null && body.sellingPrice !== "" ? Number(body.sellingPrice) : null;
  const mrp = body.mrp !== undefined && body.mrp !== null && body.mrp !== "" ? Number(body.mrp) : null;
  const stock = body.stock !== undefined && body.stock !== null && body.stock !== "" ? Number(body.stock) : null;
  const b2cAvailable = body.b2cAvailable !== false;
  const featured = body.featured === true;
  const colour = String(body.colour || "").trim();
  const material = String(body.material || "").trim();
  const weight = String(body.weight || "").trim();
  const length = String(body.length || "").trim();
  const width = String(body.width || "").trim();
  const height = String(body.height || "").trim();
  const capacity = String(body.capacity || "").trim();
  const compartments = String(body.compartments || "").trim();
  const features = Array.isArray(body.features) ? body.features.map(String) : [];
  const description = String(body.description || "").trim();
  const seoTitle = String(body.seoTitle || "").trim();
  const seoDescription = String(body.seoDescription || "").trim();

  const imageFront = String(body.imageFront || "").trim();
  const imageBack = body.imageBack ? String(body.imageBack).trim() : null;
  const imageLeft = body.imageLeft ? String(body.imageLeft).trim() : null;
  const imageRight = body.imageRight ? String(body.imageRight).trim() : null;
  const imageTop = body.imageTop ? String(body.imageTop).trim() : null;
  const imageBottom = body.imageBottom ? String(body.imageBottom).trim() : null;
  const imageInside = body.imageInside ? String(body.imageInside).trim() : null;
  const imageZipper = body.imageZipper ? String(body.imageZipper).trim() : null;
  const imageStrap = body.imageStrap ? String(body.imageStrap).trim() : null;
  const imageLifestyle = body.imageLifestyle ? String(body.imageLifestyle).trim() : null;

  if (!name || !sku || !slug || !category) {
    return jsonError("Name, SKU, slug, and category are required.", 400);
  }

  const existingSku = await findProductBySku(sku);
  if (existingSku) {
    return jsonError("A product with this SKU already exists.", 409);
  }

  const existingSlug = await findProductBySlug(slug);
  if (existingSlug) {
    return jsonError("A product with this slug already exists.", 409);
  }

  try {
    const product = await createAdminProduct({
      id: newId("prd"),
      name,
      sku,
      slug,
      category,
      subcategory,
      sellingPrice: sellingPrice,
      mrp: mrp,
      stock: stock,
      b2cAvailable,
      featured,
      colour,
      material,
      weight,
      length,
      width,
      height,
      capacity,
      compartments,
      features,
      description,
      seoTitle,
      seoDescription,
      imageFront,
      imageBack,
      imageLeft,
      imageRight,
      imageTop,
      imageBottom,
      imageInside,
      imageZipper,
      imageStrap,
      imageLifestyle,
    });

    try {
      await revalidateProductPaths(product.category, product.slug);
    } catch {
      // Cache revalidation is best-effort; do not fail the request.
    }
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
