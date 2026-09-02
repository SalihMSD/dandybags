"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/format";
import { BarChart } from "@/components/admin/BarChart";

type AnalyticsResponse = {
  dateRange: { start: string; end: string };
  metrics: {
    totalRevenue: number;
    paidOrders: number;
    avgOrderValue: number;
    periodRevenue: number;
  };
  periods: {
    today: { revenue: number; orders: number; avgOrderValue: number };
    sevenDays: { revenue: number; orders: number; avgOrderValue: number };
    thirtyDays: { revenue: number; orders: number; avgOrderValue: number };
    allTime: { revenue: number; orders: number; avgOrderValue: number };
  };
  orders: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    delivered: number;
    byStatus: Record<string, number>;
  };
  dailyRevenue: { date: string; revenue: number; count: number }[];
  dailyOrders: { date: string; count: number; revenue: number }[];
  topProducts: { rank: number; sku: string; name: string; qtySold: number; revenue: number }[];
  categories: { category: string; unitsSold: number; revenue: number; percentage: number }[];
  customers: {
    total: number;
    newInPeriod: number;
    withOrders: number;
    repeat: number;
  };
};

const PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "week" },
  { label: "Last 30 Days", value: "month" },
  { label: "This Month", value: "this-month" },
  { label: "Last Month", value: "last-month" },
];

function getDateRange(preset: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(today);

  switch (preset) {
    case "today":
      return { start: today, end: endToday };
    case "week":
      return { start: new Date(now.setDate(now.getDate() - 6)), end: today };
    case "month":
      return { start: new Date(now.setMonth(now.getMonth() - 1)), end: today };
    case "this-month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: today };
    }
    case "last-month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: s, end: e };
    }
    case "custom":
      return {
        start: customStart ? new Date(customStart) : today,
        end: customEnd ? new Date(customEnd) : today,
      };
    default:
      return { start: today, end: today };
  }
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded border border-ink/10 bg-paper p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-ink-soft">{subtitle}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preset, setPreset] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  function load() {
    const { start, end } = getDateRange(preset, customStart, customEnd);
    const params = new URLSearchParams();
    params.set("start", start.toISOString().split("T")[0]);
    params.set("end", end.toISOString().split("T")[0]);

    setLoading(true);
    setError("");
    fetch(`/api/admin/analytics?${params.toString()}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load analytics. Please try again.");
        return res.json() as Promise<AnalyticsResponse>;
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, [preset, customStart, customEnd]);

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-ink-soft">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-800">{error}</p>
        <button onClick={load} className="h-10 bg-ink px-5 text-[11px] tracking-[0.16em] uppercase text-paper">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-ink-soft">No data available.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap sm:gap-4">
        <div className="flex scroll-px-4 gap-2 overflow-x-auto pb-1 sm:scroll-p-0 sm:overflow-visible sm:pb-0">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => { setPreset(p.value); setCustomStart(""); setCustomEnd(""); }}
              className={`shrink-0 h-9 px-4 text-[11px] tracking-[0.16em] uppercase whitespace-nowrap ${
                preset === p.value
                  ? "bg-ink text-paper"
                  : "border border-ink/10 bg-paper text-ink hover:bg-ink/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-end sm:gap-2">
          <label className="block sm:w-32">
            <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">From</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPreset("custom"); }}
              className="mt-1 w-full rounded border border-ink/10 bg-paper px-2 py-1 text-sm outline-none focus:border-ink sm:mt-0 sm:w-32"
            />
          </label>
          <label className="block sm:w-32">
            <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPreset("custom"); }}
              className="mt-1 w-full rounded border border-ink/10 bg-paper px-2 py-1 text-sm outline-none focus:border-ink sm:mt-0 sm:w-32"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue (Period)"
          value={formatInr(data.metrics.periodRevenue)}
          subtitle={`${Math.round(data.metrics.paidOrders)} paid orders`}
        />
        <StatCard
          label="Revenue Today"
          value={formatInr(data.periods.today.revenue)}
          subtitle={`${data.periods.today.orders} orders`}
        />
        <StatCard
          label="Revenue This Week"
          value={formatInr(data.periods.sevenDays.revenue)}
          subtitle={`${data.periods.sevenDays.orders} orders`}
        />
        <StatCard
          label="Revenue This Month"
          value={formatInr(data.periods.thirtyDays.revenue)}
          subtitle={`${data.periods.thirtyDays.orders} orders`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={data.orders.total.toLocaleString("en-IN")} />
        <StatCard label="Paid Orders" value={data.orders.paid.toLocaleString("en-IN")} subtitle="Payment captured" />
        <StatCard label="Pending Orders" value={data.orders.pending.toLocaleString("en-IN")} subtitle="Awaiting payment" />
        <StatCard
          label="Cancelled"
          value={data.orders.cancelled.toLocaleString("en-IN")}
          subtitle={data.orders.delivered ? `${data.orders.delivered} delivered` : undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Average Order Value" value={formatInr(data.metrics.avgOrderValue)} subtitle="Paid orders" />
        <StatCard
          label="All-Time Revenue"
          value={formatInr(data.periods.allTime.revenue)}
          subtitle={`${data.periods.allTime.orders} paid orders`}
        />
        <StatCard
          label="All-Time AOV"
          value={formatInr(data.periods.allTime.avgOrderValue)}
          subtitle="All-time average"
        />
      </div>

      <Section title="Order Status Breakdown">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.orders.byStatus).map(([status, count]) => (
            <StatCard key={status} label={status} value={count.toLocaleString("en-IN")} />
          ))}
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Revenue Trend">
          <BarChart data={data.dailyRevenue} dataIndex="revenue" labelKey="date" height={160} />
        </Section>
        <Section title="Orders Trend">
          <BarChart data={data.dailyOrders} dataIndex="count" labelKey="date" height={160} />
        </Section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Top Products by Revenue">
          {data.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">No product revenue data yet.</p>
          ) : (
            <div className="overflow-x-auto rounded border border-ink/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10">
                    <th className="py-2">#</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="text-right">Qty Sold</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p) => (
                    <tr key={p.sku} className="border-b border-ink/5">
                      <td className="py-3 font-medium">{p.rank}</td>
                      <td>{p.name}</td>
                      <td className="font-mono text-xs">{p.sku}</td>
                      <td className="text-right">{p.qtySold}</td>
                      <td className="text-right font-medium">{formatInr(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Category Contribution">
          {data.categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">No category data for this period.</p>
          ) : (
            <>
              <BarChart data={data.categories} dataIndex="revenue" labelKey="category" height={160} />
              <div className="mt-4 overflow-x-auto rounded border border-ink/10">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10">
                      <th className="py-2">Category</th>
                      <th className="text-right">Units Sold</th>
                      <th className="text-right">Revenue</th>
                      <th className="text-right">% Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((c) => (
                      <tr key={c.category} className="border-b border-ink/5">
                        <td>{c.category}</td>
                        <td className="text-right">{c.unitsSold}</td>
                        <td className="text-right font-medium">{formatInr(c.revenue)}</td>
                        <td className="text-right">{c.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>
      </div>

      <Section title="Customers">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Customers" value={data.customers.total.toLocaleString("en-IN")} />
          <StatCard label="New in Period" value={data.customers.newInPeriod.toLocaleString("en-IN")} subtitle="Created in range" />
          <StatCard label="Customers with Orders" value={data.customers.withOrders.toLocaleString("en-IN")} subtitle="Who placed paid orders" />
          <StatCard label="Repeat Customers" value={data.customers.repeat.toLocaleString("en-IN")} subtitle="2+ paid orders" />
        </div>
      </Section>
    </div>
  );
}
