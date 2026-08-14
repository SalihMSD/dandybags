"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  createdAt: string;
  items: { name: string; qty: number }[];
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    void fetch("/api/customer/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { orders: Order[] }) => setOrders(d.orders || []));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">My Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">No orders yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
          {orders.map((o) => (
            <li key={o.id} className="p-4">
              <Link href={`/account/orders/${o.id}`} className="font-serif text-xl underline-offset-4 hover:underline">
                {o.id}
              </Link>
              <p className="mt-1 text-sm text-ink-soft">
                {new Date(o.createdAt).toLocaleDateString("en-IN")} · {o.orderStatus} · {o.paymentStatus} · {o.totalLabel}
              </p>
              <p className="mt-1 text-sm">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
