"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminOrders() {
  const [orders, setOrders] = useState<{ id: string; userId: string; orderStatus: string; createdAt: string; totalLabel: string }[]>([]);
  useEffect(() => {
    void fetch("/api/admin/overview", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []));
  }, []);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link href="/admin" className="text-xs uppercase tracking-[0.16em] underline">
        Admin
      </Link>
      <h1 className="mt-4 font-serif text-4xl">Orders</h1>
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {orders.map((o) => (
          <li key={o.id} className="p-4 text-sm">
            <p className="font-serif text-lg">{o.id}</p>
            <p className="text-ink-soft">
              {new Date(o.createdAt).toLocaleString("en-IN")} · {o.orderStatus} · {o.totalLabel}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
