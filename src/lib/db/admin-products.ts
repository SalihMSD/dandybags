import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";

const productSelect = {
  id: true,
  sku: true,
  slug: true,
  name: true,
  category: true,
  subcategory: true,
  sellingPrice: true,
  stock: true,
  b2cAvailable: true,
  featured: true,
  mrp: true,
  discountPercent: true,
  imageFront: true,
  imageBack: true,
  imageLeft: true,
  imageRight: true,
  imageTop: true,
  imageBottom: true,
  imageInside: true,
  imageZipper: true,
  imageStrap: true,
  imageLifestyle: true,
  colour: true,
  material: true,
  weight: true,
  length: true,
  width: true,
  height: true,
  capacity: true,
  compartments: true,
  features: true,
  description: true,
  seoTitle: true,
  seoDescription: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listAdminProducts() {
  const products = await prisma.product.findMany({
    select: productSelect,
    orderBy: { createdAt: "asc" },
  });
  return products;
}

export type ProductListParams = {
  search?: string;
  category?: string;
  b2cAvailable?: string;
  stockStatus?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminProductsPaginated(params: ProductListParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (params.search) {
    const q = params.search;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.category && params.category !== "all") {
    where.category = params.category;
  }

  if (params.b2cAvailable === "available") {
    where.b2cAvailable = true;
  } else if (params.b2cAvailable === "unavailable") {
    where.b2cAvailable = false;
  }

  if (params.stockStatus === "in-stock") {
    where.stock = { gt: 0 };
  } else if (params.stockStatus === "low-stock") {
    where.stock = { lt: 10, gt: 0 };
  } else if (params.stockStatus === "out-of-stock") {
    where.stock = 0;
  } else if (params.stockStatus === "unlimited") {
    where.stock = null;
  }

  const sortByMap: Record<string, string> = {
    name: "name",
    price: "sellingPrice",
    stock: "stock",
    created: "createdAt",
  };
  const column = sortByMap[params.sortBy || "created"] || "createdAt";
  const direction = params.sortDir === "asc" ? "asc" : "desc";

  const orderBy: Record<string, string> = { [column]: direction };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAdminProduct(id: string) {
  const product = await prisma.product.findUnique({
    select: productSelect,
    where: { id },
  });
  return product;
}

export async function createAdminProduct(data: Record<string, unknown>) {
  const product = await prisma.product.create({
    data: data as Parameters<typeof prisma.product.create>[0]["data"],
    select: productSelect,
  });
  return product;
}

export async function updateAdminProduct(id: string, data: Record<string, unknown>) {
  const product = await prisma.product.update({
    where: { id },
    data: data as Parameters<typeof prisma.product.update>[0]["data"],
    select: productSelect,
  });
  return product;
}

export async function bulkUpdateProducts(ids: string[], data: Record<string, unknown>) {
  return prisma.product.updateMany({
    where: { id: { in: ids } },
    data: data as Parameters<typeof prisma.product.updateMany>[0]["data"],
  });
}

export async function deleteAdminProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, sku: true, name: true },
  });
  if (!product) return null;

  const wishlistCount = await prisma.wishlist.count({ where: { sku: product.sku } });
  if (wishlistCount > 0) {
    throw new Error(`Cannot delete "${product.name}": it is in ${wishlistCount} customer wishlist(s).`);
  }

  const cartItemCount = await prisma.cartItem.count({ where: { sku: product.sku } });
  if (cartItemCount > 0) {
    throw new Error(`Cannot delete "${product.name}": it is in ${cartItemCount} customer cart(s).`);
  }

  const deleted = await prisma.product.delete({
    where: { id },
    select: productSelect,
  });
  return deleted;
}

export async function findProductBySku(sku: string, excludeId?: string) {
  const product = await prisma.product.findFirst({
    where: {
      sku,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return product;
}

export async function findProductBySlug(slug: string, excludeId?: string) {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return product;
}

export async function bulkDeleteProducts(ids: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, sku: true, name: true },
  });

  const errors: string[] = [];
  for (const product of products) {
    const wishlistCount = await prisma.wishlist.count({ where: { sku: product.sku } });
    if (wishlistCount > 0) {
      errors.push(`"${product.name}" is in ${wishlistCount} wishlist(s).`);
    }
    const cartItemCount = await prisma.cartItem.count({ where: { sku: product.sku } });
    if (cartItemCount > 0) {
      errors.push(`"${product.name}" is in ${cartItemCount} cart(s).`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  return products;
}
