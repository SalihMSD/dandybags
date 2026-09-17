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

type ReturnRequest = {
  id: string;
  orderId: string;
  status: string;
  resolution: string;
  reason: string;
  note: string | null;
  refundAmount: number | null;
  exchangeVariantSku: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  items: ReturnItem[];
  refund: ReturnRefund | null;
};

const statusColor: Record<string, string> = {
  REQUESTED: "bg-ink/10 text-ink",
  APPROVED: "bg-amber-50 text-amber-800",
  REJECTED: "bg-red-50 text-red-800",
  COMPLETED: "bg-green-50 text-green-800",
  CANCELLED: "bg-ink/10 text-ink-soft",
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/customer/returns", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load returns.");
          return;
        }
        const data = (await res.json()) as { returns: ReturnRequest[] };
        setReturns(data.returns || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="px-4 py-16 text-sm text-ink-soft">Loading returns…</p>;

  if (error) return <p className="px-4 py-16 text-sm text-red-800">{error}</p>;

  if (returns.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
        <h1 className="font-serif text-4xl">My Returns</h1>
        <div className="mt-8 rounded border border-ink/10 bg-paper p-8 text-center">
          <p className="text-sm text-ink-soft">You have not requested any returns yet.</p>
          <Link href="/account/orders" className="mt-4 inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">My Returns</h1>
      <ul className="mt-8 space-y-4">
        {returns.map((r) => (
          <li key={r.id} className="border border-ink/10 bg-paper p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-serif text-lg">Return #{r.id}</p>
                <p className="text-xs text-ink-soft">
                  Order: <Link href={`/account/orders/${r.orderId}`} className="underline">{r.orderId}</Link>
                  {" · "}
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${statusColor[r.status] || "bg-cream text-ink-soft"}`}>
                {r.status}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Resolution</span>
                <span>{r.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Reason</span>
                <span>{r.reason}</span>
              </div>
              {r.refund && (
                <div className="flex justify-between">
                  <span className="text-ink-soft">Refund Status</span>
                  <span>{r.refund.status}{r.refund.razorpayRefundId ? ` (${r.refund.razorpayRefundId})` : ""}</span>
                </div>
              )}
              {r.adminNote && (
                <div>
                  <span className="text-ink-soft">Admin Note</span>
                  <p className="mt-1">{r.adminNote}</p>
                </div>
              )}
            </div>

            <div className="mt-3">
              <p className="text-xs text-ink-soft">
                Items: {r.items.map((i) => `${i.qty}x ${i.sku}`).join(", ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
