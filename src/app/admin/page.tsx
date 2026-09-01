"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OverviewOrder = {
  id: string;
  orderStatus: string;
  paymentStatus: string;
  totalLabel: string;
  createdAt: string;
  items: { sku: string; name: string; qty: number; unitPrice: number | null }[];
};

type OverviewData = {
  counts: {
    customers: number;
    orders: number;
    addresses: number;
    products: number;
  };
  orders: OverviewOrder[];
};

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded border border-ink/10 bg-paper p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-ink-soft">{subtitle}</p> : null}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/overview", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load overview");
        const d = (await r.json()) as {
          counts: { customers: number; orders: number; addresses: number; products: number };
          orders: OverviewOrder[];
        };
        setData({ counts: d.counts, orders: d.orders });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function parseTotal(label: string): number {
    const num = Number(label.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  }

  const paidOrders = data?.orders.filter((o) => o.paymentStatus === "PAID") ?? [];
  const revenue = paidOrders.reduce((sum, o) => sum + parseTotal(o.totalLabel), 0);
  const recentOrders = data?.orders.slice(0, 8) ?? [];
  const pendingOrders = data?.orders.filter((o) => o.paymentStatus === "PENDING") ?? [];

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading dashboard…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-800">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={data?.counts.orders.toLocaleString() || "0"} subtitle={`${paidOrders.length} paid`} />
        <StatCard label="Customers" value={data?.counts.customers.toLocaleString() || "0"} />
        <StatCard label="Products" value={data?.counts.products.toLocaleString() || "0"} />
         <StatCard label="Total Revenue" value={`₹${Math.round(revenue).toLocaleString("en-IN")}`} subtitle={`${paidOrders.length} paid orders`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-xl">Pending Orders</h2>
          <p className="mt-1 text-sm text-ink-soft">{pendingOrders.length} order(s) awaiting payment capture</p>
          {pendingOrders.length > 0 ? (
            <div className="mt-3 space-y-2">
              {pendingOrders.slice(0, 5).map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex justify-between rounded border border-ink/10 bg-paper px-3 py-2 text-sm hover:bg-ink/5">
                  <span className="font-mono">{o.id}</span>
                  <span className="text-ink-soft">{o.totalLabel}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">No pending orders.</p>
          )}
          {pendingOrders.length > 5 ? (
            <Link href="/admin/orders" className="mt-3 block text-xs text-camel-dark underline">
              View all {pendingOrders.length} pending orders →
            </Link>
          ) : null}
        </div>

        <div>
          <h2 className="font-serif text-xl">Recent Orders</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10">
                  <th className="py-2">ID</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-ink-soft">No orders yet.</td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-ink/5">
                      <td className="py-3">
                        <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs underline">
                          {o.id}
                        </Link>
                      </td>
                      <td>
                        <span className={`rounded px-2 py-0.5 text-xs ${
                          o.paymentStatus === "PAID"
                            ? "bg-green-50 text-green-800"
                            : "bg-camel/20 text-ink"
                        }`}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="text-ink-soft">
                        {new Date(o.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="text-right">{o.totalLabel}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
