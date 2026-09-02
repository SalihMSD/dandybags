"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/format";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minimumOrderValue: number | null;
  maximumDiscount: number | null;
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  userId: string | null;
  status: "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  usedAt: string | null;
  sourceOrderId: string | null;
  sourceBillAmount: number | null;
  rewardPercentage: number | null;
  createdAt: string;
  updatedAt: string;
};

type CouponAnalysis = {
  totalUses: number;
  remainingUses: number;
  ordersUsingCoupon: Array<{
    orderId: string;
    totalLabel: string;
    paymentStatus: string;
    createdAt: string;
  }>;
};

function getDefaultDates() {
  const now = new Date();
  const from = now.toISOString().split("T")[0];
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return { from, until };
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => {
    const d = getDefaultDates();
    return {
      code: "",
      discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
      discountValue: "",
      minimumOrderValue: "",
      maximumDiscount: "",
      usageLimit: "1",
      validFrom: d.from,
      validUntil: d.until,
      isActive: true,
    };
  });

  const [analysisCoupon, setAnalysisCoupon] = useState<{ code: string; data: CouponAnalysis } | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");
    if (search) params.set("search", search);
    if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);

    const res = await fetch(`/api/admin/coupons?${params.toString()}`, { credentials: "include" });
    const data = (await res.json()) as { coupons?: Coupon[]; total?: number; totalPages?: number; error?: string };
    if (!res.ok) {
      setError(data.error || "Failed to load coupons.");
    } else {
      setCoupons(data.coupons || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [page, search, statusFilter]);

  function openCreate() {
    setEditingId(null);
    const d = getDefaultDates();
    setForm({
      code: "",
      discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
      discountValue: "",
      minimumOrderValue: "",
      maximumDiscount: "",
      usageLimit: "1",
      validFrom: d.from,
      validUntil: d.until,
      isActive: true,
    });
    setShowForm(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minimumOrderValue: coupon.minimumOrderValue ? String(coupon.minimumOrderValue) : "",
      maximumDiscount: coupon.maximumDiscount ? String(coupon.maximumDiscount) : "",
      usageLimit: String(coupon.usageLimit),
      validFrom: coupon.validFrom.split("T")[0],
      validUntil: coupon.validUntil.split("T")[0],
      isActive: coupon.isActive,
    });
    setShowForm(true);
  }

  async function saveCoupon() {
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minimumOrderValue: form.minimumOrderValue ? Number(form.minimumOrderValue) : null,
      maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null,
      usageLimit: Number(form.usageLimit),
      validFrom: form.validFrom,
      validUntil: form.validUntil,
      isActive: form.isActive,
    };

    let res: Response;
    if (editingId) {
      res = await fetch(`/api/admin/coupons/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          id: editingId,
        }),
      });
    } else {
      res = await fetch("/api/admin/coupons", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const data = (await res.json()) as { coupon?: Coupon; error?: string; ok?: boolean };
    if (!res.ok) {
      setError(data.error || "Failed to save coupon.");
    } else {
      setShowForm(false);
      setEditingId(null);
      void load();
    }
  }

  async function toggleActive(coupon: Coupon) {
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: coupon.id,
        isActive: !coupon.isActive,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error || "Action failed.");
    } else {
      void load();
    }
  }

  async function expire(coupon: Coupon) {
    if (!confirm(`Expire coupon "${coupon.code}"? It will be deactivated immediately.`)) return;
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: coupon.id,
        action: "expire",
      }),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error || "Action failed.");
    } else {
      void load();
    }
  }

  async function viewAnalysis(coupon: Coupon) {
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, { credentials: "include" });
    const data = (await res.json()) as { coupon?: Coupon; analysis?: CouponAnalysis; error?: string };
    if (res.ok && data.analysis) {
      setAnalysisCoupon({ code: coupon.code, data: data.analysis });
    } else {
      setError(data.error || "Failed to load analysis.");
    }
  }

  function formatDiscount(c: Coupon): string {
    if (c.discountType === "FIXED") {
      return `₹${c.discountValue.toLocaleString("en-IN")} OFF`;
    }
    return `${c.discountValue}% OFF`;
  }

  function getSource(c: Coupon): string {
    if (c.rewardPercentage != null) return `Share & Earn (${c.rewardPercentage}%)`;
    if (c.sourceOrderId) return `Order ${c.sourceOrderId.slice(-8)}`;
    return "Manual";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search coupon codes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-64 rounded border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="USED">Used</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <button
          onClick={openCreate}
          className="h-10 bg-ink px-4 text-[11px] tracking-[0.16em] uppercase text-paper"
        >
          + New Coupon
        </button>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-ink-soft">Loading coupons…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-ink-soft">
          {search || statusFilter !== "ALL" ? "No coupons match your filters." : "No coupons yet. Create one to get started."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-ink/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="py-2">Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Max Discount</th>
                <th>Used / Limit</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Source</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-ink/5">
                  <td className="font-mono text-xs font-medium">{c.code}</td>
                  <td>{c.discountType}</td>
                  <td>{formatDiscount(c)}</td>
                  <td className="text-ink-soft">{c.minimumOrderValue ? formatInr(c.minimumOrderValue) : "—"}</td>
                  <td className="text-ink-soft">{c.maximumDiscount ? formatInr(c.maximumDiscount) : "—"}</td>
                  <td className="text-ink-soft">{c.usedCount} / {c.usageLimit}</td>
                  <td className="text-ink-soft">
                    {new Date(c.validUntil).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      c.status === "ACTIVE" && c.isActive
                        ? "bg-green-50 text-green-800"
                        : c.status === "EXPIRED"
                        ? "bg-red-50 text-red-800"
                        : c.status === "USED"
                        ? "bg-camel/20 text-ink"
                        : "bg-ink/10 text-ink-soft"
                    }`}>
                      {c.isActive ? c.status : "INACTIVE"}
                    </span>
                  </td>
                  <td className="text-ink-soft">{getSource(c)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => void viewAnalysis(c)}
                        className="text-xs underline"
                        title="View analysis"
                      >
                        Analyze
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs underline"
                      >
                        Edit
                      </button>
                      {c.status === "ACTIVE" && c.isActive && (
                        <button
                          onClick={() => void toggleActive(c)}
                          className="text-xs underline"
                          title="Deactivate"
                        >
                          Deactivate
                        </button>
                      )}
                      {c.status === "ACTIVE" && (
                        <button
                          onClick={() => void expire(c)}
                          className="text-xs text-red-800 underline"
                          title="Expire now"
                        >
                          Expire
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-soft">Page {page} of {totalPages} — {total} coupon{total !== 1 ? "s" : ""}</span>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded bg-paper p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">{editingId ? "Edit Coupon" : "New Coupon"}</h2>
              <button onClick={() => setShowForm(false)} className="text-sm underline">Close</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); void saveCoupon(); }} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm">
                    Coupon Code
                    <input
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      required
                      maxLength={20}
                      className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                      placeholder="Leave blank to auto-generate"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  Discount Type
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "PERCENTAGE" | "FIXED" }))}
                    className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm"
                  >
                    <option value="PERCENTAGE">Percentage (% off)</option>
                    <option value="FIXED">Fixed (₹ off)</option>
                  </select>
                </label>

                <label className="block text-sm">
                  Discount Value
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.discountValue}
                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                    required
                    className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </label>

                <label className="block text-sm">
                  Minimum Order Value
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minimumOrderValue}
                    onChange={(e) => setForm((f) => ({ ...f, minimumOrderValue: e.target.value }))}
                    className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                    placeholder="Optional"
                  />
                </label>

                <label className="block text-sm">
                  Maximum Discount
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.maximumDiscount}
                    onChange={(e) => setForm((f) => ({ ...f, maximumDiscount: e.target.value }))}
                    className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                    placeholder="Optional (percentage only)"
                  />
                </label>

                <label className="block text-sm">
                  Usage Limit
                  <input
                    type="number"
                    min="1"
                    value={form.usageLimit}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                    required
                    className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </label>

                <label className="block text-sm">
                  Valid From
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                    required
                    className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </label>

                <label className="block text-sm">
                  Valid Until
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                    required
                    className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                </label>

                <div className="flex items-end gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-ink/10 pt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-10 border border-ink px-5 text-[11px] tracking-[0.16em] uppercase hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 bg-ink px-5 text-[11px] tracking-[0.16em] uppercase text-paper"
                >
                  {editingId ? "Update Coupon" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {analysisCoupon && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded bg-paper p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Coupon Analysis: {analysisCoupon.code}</h2>
              <button onClick={() => setAnalysisCoupon(null)} className="text-sm underline">Close</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded border border-ink/10 bg-cream p-4 text-center">
                <p className="text-2xl font-medium">{analysisCoupon.data.totalUses}</p>
                <p className="text-xs text-ink-soft">Total Uses</p>
              </div>
              <div className="rounded border border-ink/10 bg-cream p-4 text-center">
                <p className="text-2xl font-medium">{analysisCoupon.data.remainingUses}</p>
                <p className="text-xs text-ink-soft">Remaining Uses</p>
              </div>
              <div className="rounded border border-ink/10 bg-cream p-4 text-center">
                <p className="text-2xl font-medium">{analysisCoupon.data.ordersUsingCoupon.length}</p>
                <p className="text-xs text-ink-soft">Orders</p>
              </div>
            </div>
            {analysisCoupon.data.ordersUsingCoupon.length > 0 ? (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10">
                      <th className="py-2">Order ID</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisCoupon.data.ordersUsingCoupon.map((o) => (
                      <tr key={o.orderId} className="border-b border-ink/5">
                        <td className="font-mono text-xs">{o.orderId}</td>
                        <td>{o.totalLabel}</td>
                        <td>
                          <span className={`rounded px-2 py-0.5 text-xs ${
                            o.paymentStatus === "PAID" ? "bg-green-50 text-green-800" : "bg-camel/20 text-ink"
                          }`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="text-ink-soft">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-6 text-sm text-ink-soft">No orders have used this coupon yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
