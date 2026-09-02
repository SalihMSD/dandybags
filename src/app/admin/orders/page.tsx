"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminOrderItem = {
  sku: string;
  name: string;
  qty: number;
};

type AdminOrder = {
  id: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  totalLabel: string;
  trackingNumber: string | null;
  customer: { fullName: string; email: string; phone: string };
  items: AdminOrderItem[];
};

type PaginatedResponse = {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const ORDER_STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "ALL", label: "All Payments" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function buildParams() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (search) params.set("search", search);
    if (paymentFilter && paymentFilter !== "ALL") params.set("paymentStatus", paymentFilter);
    if (statusFilter && statusFilter !== "ALL") params.set("orderStatus", statusFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params;
  }

  async function load() {
    setLoading(true);
    setError("");
    const params = buildParams();
    const res = await fetch(`/api/admin/orders?${params.toString()}`, { credentials: "include" });
    const data = (await res.json()) as PaginatedResponse | { error?: string };
    if (!res.ok) {
      setError((data as { error?: string }).error || "Failed to load orders.");
    } else {
      const d = data as PaginatedResponse;
      setOrders(d.orders || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [page, search, paymentFilter, statusFilter, startDate, endDate]);

  function applyFilters() {
    setPage(1);
    void load();
  }

  const filtered = orders;
  const filterApplied = search || paymentFilter !== "ALL" || statusFilter !== "ALL" || startDate || endDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs uppercase tracking-[0.16em] text-ink-soft">Search</label>
          <input
            type="text"
            placeholder="Order ID, customer name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="mt-1 w-full rounded border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs uppercase tracking-[0.16em] text-ink-soft">Payment</label>
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="mt-1 w-full rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs uppercase tracking-[0.16em] text-ink-soft">Order Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="mt-1 w-full rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
          >
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs uppercase tracking-[0.16em] text-ink-soft">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="mt-1 w-full rounded border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs uppercase tracking-[0.16em] text-ink-soft">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="mt-1 w-full rounded border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
      </div>

      {filterApplied && (
        <button
          onClick={() => {
            setSearch("");
            setPaymentFilter("ALL");
            setStatusFilter("ALL");
            setStartDate("");
            setEndDate("");
            setPage(1);
          }}
          className="text-xs underline"
        >
          Clear all filters
        </button>
      )}

      <div className="flex justify-between">
        <span className="text-sm text-ink-soft">{total} order{total !== 1 ? "s" : ""} found</span>
        <Link
          href={`/api/admin/orders?${buildParams().toString()}&format=csv`}
          className="text-xs underline"
        >
          Export CSV
        </Link>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      <div className="overflow-x-auto rounded border border-ink/10">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2">Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="text-right">Total</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-ink-soft">Loading orders…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-ink-soft">
                  {filterApplied ? "No orders match your filters." : "No orders found."}
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="border-b border-ink/5">
                  <td className="py-3 font-mono text-xs">{o.id}</td>
                  <td>
                    <p className="font-medium">{o.customer.fullName}</p>
                    <p className="text-xs text-ink-soft">{o.customer.email}</p>
                    <p className="text-xs text-ink-soft">{o.customer.phone}</p>
                  </td>
                  <td className="text-ink-soft">
                    {o.items.length > 0
                      ? `${o.items.length} item${o.items.length > 1 ? "s" : ""} (${o.items.reduce((s, i) => s + i.qty, 0)} pcs)`
                      : "No items"}
                  </td>
                  <td className="text-ink-soft">
                    {new Date(o.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      o.paymentStatus === "PAID" ? "bg-green-50 text-green-800" : "bg-camel/20 text-ink"
                    }`}>
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className="rounded bg-paper border border-ink/10 px-2 py-0.5 text-xs">
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="text-right font-medium">{o.totalLabel}</td>
                  <td className="text-center">
                    <Link href={`/admin/orders/${o.id}`} className="text-xs underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="h-9 border border-ink px-3 text-xs uppercase disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="h-9 border border-ink px-3 text-xs uppercase disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
