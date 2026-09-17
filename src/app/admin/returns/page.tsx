"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReturnItem = {
  sku: string;
  qty: number;
  condition: string | null;
  reason: string | null;
};

type ReturnRefund = {
  id: string;
  status: string;
  amount: number;
  razorpayRefundId: string | null;
  failureReason: string | null;
};

type ReturnOrder = {
  id: string;
  totalLabel: string;
  paymentStatus: string;
};

type ReturnRequest = {
  id: string;
  orderId: string;
  status: string;
  resolution: string;
  reason: string;
  note: string | null;
  adminNote: string | null;
  refundAmount: number | null;
  exchangeVariantSku: string | null;
  processedAt: string | null;
  createdAt: string;
  items: ReturnItem[];
  refund: ReturnRefund | null;
  order: ReturnOrder;
};

const statusColor: Record<string, string> = {
  REQUESTED: "bg-ink/10 text-ink",
  APPROVED: "bg-amber-50 text-amber-800",
  REJECTED: "bg-red-50 text-red-800",
  COMPLETED: "bg-green-50 text-green-800",
  CANCELLED: "bg-ink/10 text-ink-soft",
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const RESOLUTION_OPTIONS = [
  { value: "ALL", label: "All Resolutions" },
  { value: "REFUND", label: "Refund" },
  { value: "REPLACE", label: "Replace" },
  { value: "EXCHANGE", label: "Exchange" },
];

type PaginatedResponse = {
  returns: ReturnRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [resolutionFilter, setResolutionFilter] = useState("ALL");
  const [actionPending, setActionPending] = useState<string | null>(null);

  function buildParams() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
    if (resolutionFilter && resolutionFilter !== "ALL") params.set("resolution", resolutionFilter);
    return params;
  }

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/returns?${buildParams().toString()}`, { credentials: "include" });
    const data = (await res.json()) as PaginatedResponse | { error?: string };
    if (!res.ok) {
      setError((data as { error?: string }).error || "Failed to load returns.");
    } else {
      setReturns((data as PaginatedResponse).returns || []);
      setTotal((data as PaginatedResponse).total || 0);
      setTotalPages((data as PaginatedResponse).totalPages || 1);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [page, statusFilter, resolutionFilter]);

  async function handleApprove(returnId: string) {
    setActionPending(returnId);
    try {
      const res = await fetch(`/api/admin/returns/${returnId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Action failed.");
      } else {
        void load();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setActionPending(null);
    }
  }

  async function handleProcess(returnId: string) {
    setActionPending(returnId);
    try {
      const res = await fetch(`/api/admin/returns/${returnId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Action failed.");
      } else {
        void load();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setActionPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Return Requests</h1>
        <Link
          href="/admin/orders"
          className="text-xs uppercase tracking-[0.16em] text-ink-soft underline"
        >
          Back to Orders
        </Link>
      </div>

      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={resolutionFilter}
          onChange={(e) => { setResolutionFilter(e.target.value); setPage(1); }}
          className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
        >
          {RESOLUTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      <div className="overflow-x-auto rounded border border-ink/10">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2">Return ID</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Resolution</th>
              <th>Reason</th>
              <th>Items</th>
              <th>Date</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-ink-soft">Loading returns…</td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-ink-soft">
                  {statusFilter !== "ALL" || resolutionFilter !== "ALL"
                    ? "No returns match your filters."
                    : "No return requests found."}
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id} className="border-b border-ink/5">
                  <td className="py-3 font-mono text-xs">{r.id}</td>
                  <td className="font-mono text-xs">{r.orderId}</td>
                  <td>
                    <Link href={`/admin/orders/${r.orderId}`} className="text-xs underline">
                      View Order
                    </Link>
                  </td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-xs ${statusColor[r.status] || "bg-cream text-ink-soft"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.resolution}</td>
                  <td>{r.reason}</td>
                  <td className="text-ink-soft">
                    {r.items.reduce((sum, i) => sum + i.qty, 0)} item{r.items.reduce((sum, i) => sum + i.qty, 0) !== 1 ? "s" : ""}
                  </td>
                  <td className="text-ink-soft">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="text-center">
                    {r.status === "REQUESTED" && (
                      <>
                        <button
                          onClick={() => void handleApprove(r.id)}
                          disabled={actionPending === r.id}
                          className="mr-2 text-xs underline disabled:opacity-50"
                        >
                          {actionPending === r.id ? "…" : "Approve"}
                        </button>
                        {r.resolution === "REFUND" && (
                          <button
                            onClick={() => void handleProcess(r.id)}
                            disabled={actionPending === r.id}
                            className="text-xs underline disabled:opacity-50"
                          >
                            {actionPending === r.id ? "…" : "Process Refund"}
                          </button>
                        )}
                      </>
                    )}
                    {r.status === "APPROVED" && r.resolution === "REFUND" && (
                      <button
                        onClick={() => void handleProcess(r.id)}
                        disabled={actionPending === r.id}
                        className="text-xs underline disabled:opacity-50"
                      >
                        {actionPending === r.id ? "…" : "Process Refund"}
                      </button>
                    )}
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
