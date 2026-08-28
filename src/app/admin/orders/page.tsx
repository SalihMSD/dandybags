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

  const placedPaid = orders.filter((o) => o.orderStatus === "PLACED" && o.paymentStatus === "PAID");
  const pendingPayment = orders.filter((o) => o.paymentStatus === "PENDING");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link href="/admin" className="text-xs uppercase tracking-[0.16em] underline">
        Admin
      </Link>
      <h1 className="mt-4 font-serif text-4xl">Orders</h1>
      {error ? <p className="mt-6 text-sm text-red-800">{error}</p> : null}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Placed + Paid</h2>
        <p className="mt-1 text-sm text-ink-soft">Orders ready to ship.</p>
        {placedPaid.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No placed and paid orders yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
            {placedPaid.map((o) => (
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
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Pending Payment</h2>
        <p className="mt-1 text-sm text-ink-soft">Awaiting Razorpay capture.</p>
        {pendingPayment.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No pending payment orders.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
            {pendingPayment.map((o) => (
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
        )}
      </section>
    </div>
  );
}
