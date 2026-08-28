import { prisma } from "@/lib/db/prisma";
import { publicOrder } from "@/lib/db/orders";
import { publicUser } from "@/lib/db/store";

export async function getAdminOverview() {
  const [customerRows, orders, addressCount, productCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      include: { items: { orderBy: { sku: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.address.count(),
    prisma.product.count(),
  ]);

  const customers = customerRows.map(publicUser);
  return {
    customers,
    orders: orders.map(publicOrder),
    counts: {
      customers: customers.length,
      orders: orders.length,
      addresses: addressCount,
      products: productCount,
    },
  };
}
