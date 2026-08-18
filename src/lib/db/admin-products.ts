import { prisma } from "@/lib/db/prisma";

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

export async function deleteAdminProduct(id: string) {
  const product = await prisma.product.delete({
    where: { id },
    select: productSelect,
  });
  return product;
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
