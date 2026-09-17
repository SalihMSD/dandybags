import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";

export async function getAdminOverview() {
  const [customerCount, orderCount, addressCount, productCount, recentOrders, totalPaidRevenue] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.address.count(),
    prisma.product.count(),
    prisma.order.findMany({
      include: { items: { orderBy: { sku: "asc" as const } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.$queryRaw<Array<{ total: string }>>`
      SELECT SUM(
        CAST(
          REGEXP_REPLACE(o."totalLabel", '[^0-9.]', '', 'g')
          AS NUMERIC
        )
      )::text AS total
      FROM "orders" o
      WHERE o."paymentStatus" = 'PAID'
        AND o."orderStatus" <> 'CANCELLED'
    `,
  ]);

  const revenue = totalPaidRevenue[0]?.total ? Number(totalPaidRevenue[0].total) : 0;

  return {
    customers: [],
    orders: recentOrders.map(publicOrder),
    counts: {
      customers: customerCount,
      orders: orderCount,
      addresses: addressCount,
      products: productCount,
    },
    totalRevenue: Math.round(revenue),
  };
}
