import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import { isUniqueConstraint } from "@/lib/db/users";

function decimal(value: { toString(): string } | null) {
  return value == null ? null : Number(value.toString());
}

export function publicWishlistProduct(product: {
  sku: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  imageFront: string;
  imageBack: string | null;
  imageLeft: string | null;
  imageRight: string | null;
  imageTop: string | null;
  imageBottom: string | null;
  imageInside: string | null;
  imageZipper: string | null;
  imageStrap: string | null;
  imageLifestyle: string | null;
  colour: string;
  material: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  capacity: string;
  compartments: string;
  features: string[];
  mrp: { toString(): string } | null;
  sellingPrice: { toString(): string } | null;
  stock: number | null;
  b2cAvailable: boolean;
  featured: boolean;
  description: string;
  seoTitle: string;
  seoDescription: string;
}) {
  return {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    images: {
      master: product.imageFront,
      side1: product.imageBack || product.imageFront,
      side2: product.imageLeft || product.imageFront,
      side3: product.imageRight || product.imageFront,
      side4: product.imageTop || product.imageFront,
    },
    colour: product.colour,
    material: product.material,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    capacity: product.capacity,
    compartments: product.compartments,
    features: product.features,
    mrp: decimal(product.mrp),
    sellingPrice: decimal(product.sellingPrice),
    stock: product.stock,
    b2cAvailable: product.b2cAvailable,
    featured: product.featured,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  };
}

export async function getWishlistSkus(userId: string): Promise<string[]> {
  const rows = await prisma.wishlist.findMany({
    where: { userId },
    select: { sku: true },
  });
  return rows.map((row) => row.sku);
}

export async function listWishlist(userId: string) {
  const rows = await prisma.wishlist.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { addedAt: "desc" },
  });
  return rows.map((row) => publicWishlistProduct(row.product));
}

export async function addWishlistItem(userId: string, sku: string) {
  const product = await prisma.product.findUnique({ where: { sku } });
  if (!product) return { ok: false as const, error: "Product not found.", status: 404 as const };

  try {
    await prisma.wishlist.create({
      data: {
        id: newId("wsh"),
        userId,
        sku,
      },
    });
  } catch (error) {
    if (!isUniqueConstraint(error)) {
      return { ok: false as const, error: "Something went wrong. Please try again.", status: 500 as const };
    }
  }

  return { ok: true as const };
}

export async function removeWishlistItem(userId: string, sku: string) {
  await prisma.wishlist.deleteMany({
    where: { userId, sku },
  });
}
