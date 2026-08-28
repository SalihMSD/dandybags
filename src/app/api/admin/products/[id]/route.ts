import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminProduct, updateAdminProduct, deleteAdminProduct, findProductBySku, findProductBySlug } from "@/lib/db/admin-products";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

async function revalidateProductPaths(category?: string, slug?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/categories");
  if (category) revalidatePath(`/categories/${category}`);
  if (slug) revalidatePath(`/shop/${slug}`);
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { id } = await ctx.params;
  try {
    const product = await getAdminProduct(id);
    if (!product) return jsonError("Product not found.", 404);
    return Response.json({ product });
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Something went wrong. Please try again.", 400);
  }

  const existing = await getAdminProduct(id);
  if (!existing) return jsonError("Product not found.", 404);

  const name = body.name !== undefined ? String(body.name).trim() : undefined;
  const sku = body.sku !== undefined ? String(body.sku).trim() : undefined;
  const slug = body.slug !== undefined ? String(body.slug).trim() : undefined;
  const category = body.category !== undefined ? String(body.category).trim() : undefined;
  const subcategory = body.subcategory !== undefined ? String(body.subcategory).trim() : undefined;
  const sellingPrice = body.sellingPrice !== undefined && body.sellingPrice !== null && body.sellingPrice !== "" ? Number(body.sellingPrice) : undefined;
  const mrp = body.mrp !== undefined && body.mrp !== null && body.mrp !== "" ? Number(body.mrp) : undefined;
  const discountPercent = body.discountPercent !== undefined && body.discountPercent !== null && body.discountPercent !== "" ? Number(body.discountPercent) : undefined;
  const stock = body.stock !== undefined && body.stock !== null && body.stock !== "" ? Number(body.stock) : undefined;
  const b2cAvailable = body.b2cAvailable !== undefined ? body.b2cAvailable === true || body.b2cAvailable === "true" : undefined;
  const featured = body.featured !== undefined ? body.featured === true || body.featured === "true" : undefined;
  const colour = body.colour !== undefined ? String(body.colour).trim() : undefined;
  const material = body.material !== undefined ? String(body.material).trim() : undefined;
  const weight = body.weight !== undefined ? String(body.weight).trim() : undefined;
  const length = body.length !== undefined ? String(body.length).trim() : undefined;
  const width = body.width !== undefined ? String(body.width).trim() : undefined;
  const height = body.height !== undefined ? String(body.height).trim() : undefined;
  const capacity = body.capacity !== undefined ? String(body.capacity).trim() : undefined;
  const compartments = body.compartments !== undefined ? String(body.compartments).trim() : undefined;
  const features = Array.isArray(body.features) ? body.features.map(String) : undefined;
  const description = body.description !== undefined ? String(body.description).trim() : undefined;
  const seoTitle = body.seoTitle !== undefined ? String(body.seoTitle).trim() : undefined;
  const seoDescription = body.seoDescription !== undefined ? String(body.seoDescription).trim() : undefined;

  const imageFront = body.imageFront !== undefined ? String(body.imageFront).trim() : undefined;
  const imageBack = body.imageBack !== undefined ? (body.imageBack ? String(body.imageBack).trim() : null) : undefined;
  const imageLeft = body.imageLeft !== undefined ? (body.imageLeft ? String(body.imageLeft).trim() : null) : undefined;
  const imageRight = body.imageRight !== undefined ? (body.imageRight ? String(body.imageRight).trim() : null) : undefined;
  const imageTop = body.imageTop !== undefined ? (body.imageTop ? String(body.imageTop).trim() : null) : undefined;
  const imageBottom = body.imageBottom !== undefined ? (body.imageBottom ? String(body.imageBottom).trim() : null) : undefined;
  const imageInside = body.imageInside !== undefined ? (body.imageInside ? String(body.imageInside).trim() : null) : undefined;
  const imageZipper = body.imageZipper !== undefined ? (body.imageZipper ? String(body.imageZipper).trim() : null) : undefined;
  const imageStrap = body.imageStrap !== undefined ? (body.imageStrap ? String(body.imageStrap).trim() : null) : undefined;
  const imageLifestyle = body.imageLifestyle !== undefined ? (body.imageLifestyle ? String(body.imageLifestyle).trim() : null) : undefined;

  if (sku && sku !== existing.sku) {
    const duplicate = await findProductBySku(sku, id);
    if (duplicate) return jsonError("A product with this SKU already exists.", 409);
  }

  if (slug && slug !== existing.slug) {
    const duplicate = await findProductBySlug(slug, id);
    if (duplicate) return jsonError("A product with this slug already exists.", 409);
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (sku !== undefined) data.sku = sku;
  if (slug !== undefined) data.slug = slug;
  if (category !== undefined) data.category = category;
  if (subcategory !== undefined) data.subcategory = subcategory;
  if (sellingPrice !== undefined) data.sellingPrice = sellingPrice;
  if (mrp !== undefined) data.mrp = mrp;
  if (discountPercent !== undefined) data.discountPercent = discountPercent;
  if (stock !== undefined) data.stock = stock;
  if (b2cAvailable !== undefined) data.b2cAvailable = b2cAvailable;
  if (featured !== undefined) data.featured = featured;
  if (colour !== undefined) data.colour = colour;
  if (material !== undefined) data.material = material;
  if (weight !== undefined) data.weight = weight;
  if (length !== undefined) data.length = length;
  if (width !== undefined) data.width = width;
  if (height !== undefined) data.height = height;
  if (capacity !== undefined) data.capacity = capacity;
  if (compartments !== undefined) data.compartments = compartments;
  if (features !== undefined) data.features = features;
  if (description !== undefined) data.description = description;
  if (seoTitle !== undefined) data.seoTitle = seoTitle;
  if (seoDescription !== undefined) data.seoDescription = seoDescription;
  if (imageFront !== undefined) data.imageFront = imageFront;
  if (imageBack !== undefined) data.imageBack = imageBack;
  if (imageLeft !== undefined) data.imageLeft = imageLeft;
  if (imageRight !== undefined) data.imageRight = imageRight;
  if (imageTop !== undefined) data.imageTop = imageTop;
  if (imageBottom !== undefined) data.imageBottom = imageBottom;
  if (imageInside !== undefined) data.imageInside = imageInside;
  if (imageZipper !== undefined) data.imageZipper = imageZipper;
  if (imageStrap !== undefined) data.imageStrap = imageStrap;
  if (imageLifestyle !== undefined) data.imageLifestyle = imageLifestyle;

  try {
    const product = await updateAdminProduct(id, data);
    try {
      await revalidateProductPaths(product.category, product.slug);
    } catch {
      // Cache revalidation is best-effort; do not fail the request.
    }
    return Response.json({ product });
  } catch (error) {
    console.error("Failed to update product:", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }
  const { id } = await ctx.params;
  try {
    const existing = await getAdminProduct(id);
    if (!existing) return jsonError("Product not found.", 404);

    await deleteAdminProduct(id);
    try {
      await revalidateProductPaths(existing.category, existing.slug);
    } catch {
      // Cache revalidation is best-effort; do not fail the request.
    }
    return Response.json({ product: existing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    const status = message.includes("wishlist") || message.includes("cart") ? 409 : 500;
    return jsonError(message, status);
  }
}
