import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import {
  listAdminProductsPaginated,
  listAdminProducts,
  createAdminProduct,
  findProductBySku,
  findProductBySlug,
  bulkUpdateProducts,
  bulkDeleteProducts,
} from "@/lib/db/admin-products";
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

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);
  const usePaginated = searchParams.has("page") || searchParams.has("search") || searchParams.has("category") || searchParams.has("b2cAvailable") || searchParams.has("stockStatus") || searchParams.has("sortBy");

  if (!usePaginated) {
    const products = await listAdminProducts();
    return Response.json({ products });
  }

  try {
    const result = await listAdminProductsPaginated({
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      b2cAvailable: searchParams.get("b2cAvailable") || undefined,
      stockStatus: searchParams.get("stockStatus") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortDir: searchParams.get("sortDir") || undefined,
      page: Number(searchParams.get("page") || "1"),
      pageSize: Number(searchParams.get("pageSize") || "20"),
    });
    return Response.json(result);
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
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) {
    return jsonError("No product IDs provided.", 400);
  }

  const data: Record<string, unknown> = {};
  if (body.b2cAvailable !== undefined) data.b2cAvailable = body.b2cAvailable === true;
  if (body.stock !== undefined) data.stock = body.stock === "" ? null : Number(body.stock);
  if (body.featured !== undefined) data.featured = body.featured === true;

  if (Object.keys(data).length === 0) {
    return jsonError("No valid fields to update.", 400);
  }

  try {
    await bulkUpdateProducts(ids as string[], data);
    return Response.json({ ok: true, count: ids.length });
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
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) {
    return jsonError("No product IDs provided.", 400);
  }

  try {
    await bulkDeleteProducts(ids as string[]);
    return Response.json({ ok: true, count: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    return jsonError(message, 409);
  }
}
