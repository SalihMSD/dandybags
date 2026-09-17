import { prisma } from "@/lib/db/prisma";
import { formatIndiaDate, indiaDateToUtcRange, subtractDays } from "@/lib/format";
import { resolveAnalyticsRange, AnalyticsRangeError } from "./analytics-range";
import type { AnalyticsDateRange } from "./analytics-range";

export { resolveAnalyticsRange, AnalyticsRangeError, ANALYTICS_MAX_RANGE_DAYS } from "./analytics-range";
export type { AnalyticsDateRange } from "./analytics-range";

export function parseTotalLabel(label: string): number {
  const num = Number(label.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
}

export async function getAdminAnalytics(range?: AnalyticsDateRange) {
  const todayIndiaStr = formatIndiaDate(new Date());
  const { start, end } = resolveAnalyticsRange(range, todayIndiaStr);

  const whereClause = { gte: start, lt: end };

  const [paidOrders, allOrders, orderItems, categoryAgg, totalCustomers, newCustomersInPeriod, allTimeStats] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: "PAID", orderStatus: { not: "CANCELLED" }, createdAt: whereClause },
      select: { id: true, totalLabel: true, orderStatus: true, createdAt: true, userId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { createdAt: whereClause },
      select: {
        id: true,
        paymentStatus: true,
        orderStatus: true,
        totalLabel: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.orderItem.findMany({
      where: { order: { paymentStatus: "PAID", createdAt: whereClause } },
      select: { sku: true, name: true, qty: true, unitPrice: true },
    }),
    prisma.$queryRaw<
      Array<{
        category: string;
        units_sold: number;
        revenue: string;
      }>
    >`
      SELECT
        p.category,
        SUM(oi.qty)::text AS units_sold,
        SUM(CAST(oi."unitPrice" AS DECIMAL) * oi.qty)::text AS revenue
      FROM order_items oi
      JOIN "products" p ON p.sku = oi.sku
      JOIN "orders" o ON o.id = oi."orderId"
       WHERE o."paymentStatus" = 'PAID'
        AND o."orderStatus" <> 'CANCELLED'
        AND o."createdAt" >= ${start}
        AND o."createdAt" < ${end}
      GROUP BY p.category
      ORDER BY revenue DESC
    `,
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: whereClause } }),
    prisma.$queryRaw<
      Array<{
        total_revenue: string;
        total_orders: string;
      }>
    >`
      SELECT
        SUM(
          CAST(
            REGEXP_REPLACE(o."totalLabel", '[^0-9.]', '', 'g')
            AS NUMERIC
          )
        )::text AS total_revenue,
        COUNT(*)::text AS total_orders
      FROM "orders" o
      WHERE o."paymentStatus" = 'PAID'
        AND o."orderStatus" <> 'CANCELLED'
    `,
  ]);

  let paidRevenue = 0;
  let periodOrders = 0;

  const dailyMap = new Map<string, { revenue: number; count: number }>();
  const orderStatusCounts: Record<string, number> = {};
  const paymentStatusCounts: Record<string, number> = {};
  const customerOrderMap = new Map<string, number>();

  for (const order of allOrders) {
    const amount = parseTotalLabel(order.totalLabel);

    if (order.paymentStatus === "PAID" && order.orderStatus !== "CANCELLED") {
      paidRevenue += amount;
      periodOrders++;
      customerOrderMap.set(order.userId, (customerOrderMap.get(order.userId) || 0) + 1);
    }

    const dk = formatIndiaDate(order.createdAt);
    const existing = dailyMap.get(dk) ?? { revenue: 0, count: 0 };
    existing.revenue += order.paymentStatus === "PAID" && order.orderStatus !== "CANCELLED" ? amount : 0;
    existing.count++;
    dailyMap.set(dk, existing);

    const psKey = order.paymentStatus;
    paymentStatusCounts[psKey] = (paymentStatusCounts[psKey] || 0) + 1;

    const osKey = order.orderStatus;
    orderStatusCounts[osKey] = (orderStatusCounts[osKey] || 0) + 1;
  }

  const todayKey = todayIndiaStr;
  const sevenDaysAgoKey = subtractDays(todayKey, 6);
  const thirtyDaysAgoKey = subtractDays(todayKey, 29);

  let todayRevenue = 0;
  let todayOrders = 0;
  let sevenDayRevenue = 0;
  let sevenDayOrders = 0;
  let thirtyDayRevenue = 0;
  let thirtyDayOrders = 0;

  for (const order of paidOrders) {
    const amount = parseTotalLabel(order.totalLabel);
    const dk = formatIndiaDate(order.createdAt);

    if (dk === todayKey) {
      todayRevenue += amount;
      todayOrders++;
    }
    if (dk >= sevenDaysAgoKey) {
      sevenDayRevenue += amount;
      sevenDayOrders++;
    }
    if (dk >= thirtyDaysAgoKey) {
      thirtyDayRevenue += amount;
      thirtyDayOrders++;
    }
  }

  const paidCount = paidOrders.length;

  const dailyData = Array.from(dailyMap.entries())
    .map(([date, { revenue, count }]) => ({ date, revenue: Math.round(revenue), count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const dailyRevenue = dailyData;
  const dailyOrders = dailyData;

  const productMap = new Map<string, { sku: string; name: string; qty: number; revenue: number }>();
  for (const item of orderItems) {
    const key = item.sku;
    const price = item.unitPrice != null ? Number(item.unitPrice.toString()) : 0;
    const lineTotal = price * item.qty;
    const existing = productMap.get(key) ?? { sku: item.sku, name: item.name, qty: 0, revenue: 0 };
    existing.qty += item.qty;
    existing.revenue += lineTotal;
    productMap.set(key, existing);
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p, index) => ({
      rank: index + 1,
      sku: p.sku,
      name: p.name,
      qtySold: p.qty,
      revenue: Math.round(p.revenue),
    }));

  const categoryTotalRevenue = categoryAgg.reduce((sum, c) => sum + Number(c.revenue || "0"), 0);

  const categories = categoryAgg.map((c) => ({
    category: String(c.category || "Unknown"),
    unitsSold: Number(c.units_sold || "0"),
    revenue: Math.round(Number(c.revenue || "0")),
    percentage: categoryTotalRevenue > 0 ? Math.round((Number(c.revenue || "0") / categoryTotalRevenue) * 100 * 100) / 100 : 0,
  }));

  const repeatCustomers = Array.from(customerOrderMap.values()).filter((count) => count > 1).length;

  const avgOrderValue = paidCount > 0 ? paidRevenue / paidCount : 0;

  const orderBreakdown = {
    total: allOrders.length,
    paid: paymentStatusCounts["PAID"] || 0,
    pending: paymentStatusCounts["PENDING"] || 0,
    failed: paymentStatusCounts["FAILED"] || 0,
  };

  const orderStatusBreakdown: Record<string, number> = {};
  for (const status of ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]) {
    orderStatusBreakdown[status] = orderStatusCounts[status] || 0;
  }

  return {
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      totalRevenue: Math.round(paidRevenue),
      paidOrders: paidCount,
      avgOrderValue: Math.round(avgOrderValue),
      periodRevenue: Math.round(paidRevenue),
    },
    periods: {
      today: {
        revenue: Math.round(todayRevenue),
        orders: todayOrders,
        avgOrderValue: todayOrders > 0 ? Math.round(todayRevenue / todayOrders) : 0,
      },
      sevenDays: {
        revenue: Math.round(sevenDayRevenue),
        orders: sevenDayOrders,
        avgOrderValue: sevenDayOrders > 0 ? Math.round(sevenDayRevenue / sevenDayOrders) : 0,
      },
      thirtyDays: {
        revenue: Math.round(thirtyDayRevenue),
        orders: thirtyDayOrders,
        avgOrderValue: thirtyDayOrders > 0 ? Math.round(thirtyDayRevenue / thirtyDayOrders) : 0,
      },
      allTime: {
        revenue: Math.round(Number(allTimeStats[0]?.total_revenue || "0")),
        orders: Number(allTimeStats[0]?.total_orders || "0"),
        avgOrderValue: allTimeStats[0] && Number(allTimeStats[0].total_orders) > 0
          ? Math.round(Number(allTimeStats[0].total_revenue || "0") / Number(allTimeStats[0].total_orders))
          : 0,
      },
    },
    orders: {
      total: orderBreakdown.total,
      paid: orderBreakdown.paid,
      pending: orderBreakdown.pending,
      cancelled: orderStatusBreakdown.CANCELLED,
      delivered: orderStatusBreakdown.DELIVERED,
      byStatus: orderStatusBreakdown,
      byPayment: orderBreakdown,
    },
    dailyRevenue,
    dailyOrders: dailyOrders.map((d) => ({ date: d.date, count: d.count, revenue: d.revenue })),
    topProducts,
    categories,
    customers: {
      total: totalCustomers,
      newInPeriod: newCustomersInPeriod,
      withOrders: customerOrderMap.size,
      repeat: repeatCustomers,
    },
  };
}
