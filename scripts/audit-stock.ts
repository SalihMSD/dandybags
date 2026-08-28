import { prisma } from "../src/lib/db/prisma";
async function main() {
  const total = await prisma.product.count();
  const withStock = await prisma.product.count({ where: { stock: { not: null } } });
  const nullStock = await prisma.product.count({ where: { stock: null } });
  const samples = await prisma.product.findMany({
    where: { stock: { not: null } },
    select: { sku: true, stock: true, b2cAvailable: true },
    take: 5,
  });
  console.log(JSON.stringify({ total, withStock, nullStock, samples }, null, 2));
}
main().finally(() => prisma.$disconnect());
