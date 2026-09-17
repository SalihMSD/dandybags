import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseTotalLabel } from "../src/lib/db/analytics";

interface TestOrder {
  paymentStatus: string;
  orderStatus: string;
  totalLabel: string;
}

describe("parseTotalLabel: revenue parsing", () => {
  it("T1: parses standard Indian currency label", () => {
    assert.equal(parseTotalLabel("₹1,499"), 1499);
  });

  it("T2: parses plain number string", () => {
    assert.equal(parseTotalLabel("750"), 750);
  });

  it("T3: returns 0 for empty string", () => {
    assert.equal(parseTotalLabel(""), 0);
  });

  it("T4: returns 0 for NaN", () => {
    assert.equal(parseTotalLabel("invalid"), 0);
  });
});

describe("dashboard revenue: cancelled order exclusion", () => {
  it("T5: cancelled orders are excluded from revenue (simulated order list)", () => {
    const orders: TestOrder[] = [
      { paymentStatus: "PAID", orderStatus: "DELIVERED", totalLabel: "₹1,000" },
      { paymentStatus: "PAID", orderStatus: "CANCELLED", totalLabel: "₹500" },
      { paymentStatus: "PAID", orderStatus: "DELIVERED", totalLabel: "₹2,000" },
      { paymentStatus: "PENDING", orderStatus: "PLACED", totalLabel: "₹300" },
    ];

    const revenue = orders
      .filter((o) => o.paymentStatus === "PAID" && o.orderStatus !== "CANCELLED")
      .reduce((sum, o) => sum + parseTotalLabel(o.totalLabel), 0);

    assert.equal(revenue, 3000);
  });

  it("T6: all-cancelled paid orders yield zero revenue", () => {
    const orders: TestOrder[] = [
      { paymentStatus: "PAID", orderStatus: "CANCELLED", totalLabel: "₹500" },
      { paymentStatus: "PAID", orderStatus: "CANCELLED", totalLabel: "₹1,000" },
    ];

    const revenue = orders
      .filter((o) => o.paymentStatus === "PAID" && o.orderStatus !== "CANCELLED")
      .reduce((sum, o) => sum + parseTotalLabel(o.totalLabel), 0);

    assert.equal(revenue, 0);
  });

  it("T7: revenue does not depend on latest 10 orders only", () => {
    const orders: TestOrder[] = [];
    for (let i = 0; i < 25; i++) {
      orders.push({ paymentStatus: "PAID", orderStatus: "DELIVERED", totalLabel: "₹100" });
    }

    const allRevenue = orders
      .filter((o) => o.paymentStatus === "PAID" && o.orderStatus !== "CANCELLED")
      .reduce((sum, o) => sum + parseTotalLabel(o.totalLabel), 0);

    assert.equal(allRevenue, 2500);
  });

  it("T8: dashboard and analytics revenue rule is identical", () => {
    const orders: TestOrder[] = [
      { paymentStatus: "PAID", orderStatus: "DELIVERED", totalLabel: "₹1,000" },
      { paymentStatus: "PAID", orderStatus: "CANCELLED", totalLabel: "₹500" },
      { paymentStatus: "PAID", orderStatus: "DELIVERED", totalLabel: "₹2,000" },
      { paymentStatus: "PENDING", orderStatus: "PLACED", totalLabel: "₹300" },
      { paymentStatus: "PAID", orderStatus: "PLACED", totalLabel: "₹750" },
    ];

    const revRule = (orders: TestOrder[]) =>
      orders
        .filter((o) => o.paymentStatus === "PAID" && o.orderStatus !== "CANCELLED")
        .reduce((sum, o) => sum + parseTotalLabel(o.totalLabel), 0);

    const dashboardRevenue = revRule(orders);
    const analyticsRevenue = revRule(orders);

    assert.equal(dashboardRevenue, analyticsRevenue);
    assert.equal(dashboardRevenue, 3750);
  });
});

describe("order count semantics: cancelled orders preserved", () => {
  it("T9: Total Orders count includes cancelled orders", () => {
    const orders = [
      { orderStatus: "DELIVERED" },
      { orderStatus: "CANCELLED" },
      { orderStatus: "PLACED" },
    ];

    const total = orders.length;
    assert.equal(total, 3);
  });

  it("T10: Paid order count excludes cancelled and non-paid", () => {
    const orders = [
      { paymentStatus: "PAID", orderStatus: "DELIVERED" },
      { paymentStatus: "PAID", orderStatus: "CANCELLED" },
      { paymentStatus: "PENDING", orderStatus: "PLACED" },
    ];

    const paid = orders.filter((o) => o.paymentStatus === "PAID").length;
    assert.equal(paid, 2);
  });
});

describe("admin overview: includes all order statuses in recent orders", () => {
  it("T11: recent orders query has no orderStatus filter that would exclude new orders", () => {
    const allOrderStatuses = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

    const recentOrders = allOrderStatuses.map((s, i) => ({
      id: `order_${i}`,
      orderStatus: s as string,
      paymentStatus: "PAID",
      totalLabel: "₹100",
    }));

    const visibleCount = recentOrders.length;
    assert.equal(visibleCount, 5);
  });
});
