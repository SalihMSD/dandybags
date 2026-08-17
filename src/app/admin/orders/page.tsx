"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminOrder = {
  id: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  totalLabel: string;
  trackingNumber: string | null;
  customer: { fullName: string };
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/orders", { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as { orders?: AdminOrder[]; error?: string };
        if (!res.ok) setError(data.error || "Access denied.");
        else setOrders(data.orders || []);
      });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link href="/admin" className="text-xs uppercase tracking-[0.16em] underline">
        Admin
      </Link>
      <h1 className="mt-4 font-serif text-4xl">Orders</h1>
      {error ? <p className="mt-6 text-sm text-red-800">{error}</p> : null}
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {orders.map((o) => (
          <li key={o.id} className="p-4 text-sm">
            <Link href={`/admin/orders/${o.id}`} className="font-serif text-lg underline-offset-4 hover:underline">
              {o.id}
            </Link>
            <p className="mt-1 text-ink-soft">
              {o.customer.fullName} · {new Date(o.createdAt).toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-ink-soft">
              {o.orderStatus} · {o.paymentStatus} · {o.totalLabel}
              {o.trackingNumber ? ` · Tracking ${o.trackingNumber}` : " · No tracking yet"}
            </p>
          </li>
        ))}
      </ul>
      {orders.length === 0 && !error ? <p className="mt-8 text-sm text-ink-soft">No orders yet.</p> : null}
    </div>
  );
}
