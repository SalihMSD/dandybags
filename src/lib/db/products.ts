import { prisma } from "@/lib/db/prisma";
import { discountPercent } from "@/lib/format";

export type Product = {
  sku: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  images: {
    master: string;
    side1: string;
    side2: string;
    side3: string;
    side4: string;
  };
  colour: string;
  material: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  capacity: string;
  compartments: string;
  features: string[];
  mrp: number | null;
  sellingPrice: number | null;
  discountPercent: number;
  stock: number | null;
  b2cAvailable: boolean;
  featured: boolean;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

function toPublic(product: {
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
  discountPercent: number;
}): Product {
  const images: Product["images"] = {
    master: product.imageFront,
    side1: product.imageBack || product.imageFront,
    side2: product.imageLeft || product.imageFront,
    side3: product.imageRight || product.imageFront,
    side4: product.imageTop || product.imageFront,
  };

  const mrp = product.mrp ? Number(product.mrp.toString()) : null;
  const sellingPrice = product.sellingPrice ? Number(product.sellingPrice.toString()) : null;

  return {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    images,
    colour: product.colour,
    material: product.material,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    capacity: product.capacity,
    compartments: product.compartments,
    features: product.features,
    mrp,
    sellingPrice,
    discountPercent: product.discountPercent || 0,
    stock: product.stock,
    b2cAvailable: product.b2cAvailable,
    featured: product.featured,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  };
}

export async function listPublicProducts(filters?: {
  category?: string;
  featured?: boolean;
  search?: string;
  b2cAvailable?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "featured";
}) {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.featured !== undefined) where.featured = filters.featured;
  if (filters?.b2cAvailable !== undefined) where.b2cAvailable = filters.b2cAvailable;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { sku: { contains: filters.search } },
      { category: { contains: filters.search } },
    ];
  }

  const orderBy: Record<string, unknown> = {};
  switch (filters?.sort) {
    case "price-asc":
      orderBy.sellingPrice = "asc";
      break;
    case "price-desc":
      orderBy.sellingPrice = "desc";
      break;
    case "featured":
      orderBy.featured = "desc";
      break;
    case "newest":
    default:
      orderBy.createdAt = "desc";
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map(toPublic),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
  });
  if (!product) return null;
  return toPublic(product);
}

export async function getPublicProductBySku(sku: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { sku },
  });
  if (!product) return null;
  return toPublic(product);
}

export async function listFeaturedProducts(limit = 8) {
  const products = await prisma.product.findMany({
    where: { featured: true, b2cAvailable: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return products.map(toPublic);
}

export async function listNewArrivals(limit = 8) {
  const products = await prisma.product.findMany({
    where: { b2cAvailable: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return products.map(toPublic);
}

export async function listProductsByCategory(category: string) {
  const products = await prisma.product.findMany({
    where: { category, b2cAvailable: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map(toPublic);
}
