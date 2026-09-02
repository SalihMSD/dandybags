import { prisma } from "@/lib/db/prisma";

export async function getAdminOverview() {
  const [customerCount, orderCount, addressCount, productCount] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.address.count(),
    prisma.product.count(),
  ]);

  return {
    customers: [],
    orders: [],
    counts: {
      customers: customerCount,
      orders: orderCount,
      addresses: addressCount,
      products: productCount,
    },
  };
}
