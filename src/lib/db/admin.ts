import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";

export async function getAdminOverview() {
  const [customerCount, orderCount, addressCount, productCount, recentOrders] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.address.count(),
    prisma.product.count(),
    prisma.order.findMany({
      include: { items: { orderBy: { sku: "asc" as const } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    customers: [],
    orders: recentOrders.map(publicOrder),
    counts: {
      customers: customerCount,
      orders: orderCount,
      addresses: addressCount,
      products: productCount,
    },
  };
}
