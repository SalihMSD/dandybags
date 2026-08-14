"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Order = {
  id: string;
  createdAt: string;
  items: { name: string; qty: number; sku: string }[];
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
};

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/customer/orders/${params.orderId}`, { credentials: "include" }).then(async (res) => {
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok) setError(data.error || "Order not found.");
      else setOrder(data.order || null);
    });
  }, [params.orderId]);

  if (error) return <p className="px-4 py-16">{error}</p>;
  if (!order) return <p className="px-4 py-16">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">Order {order.id}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {new Date(order.createdAt).toLocaleString("en-IN")} · Status {order.orderStatus} · Payment {order.paymentStatus}
      </p>
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {order.items.map((i) => (
          <li key={i.sku} className="flex justify-between p-4 text-sm">
            <span>{i.name}</span>
            <span>× {i.qty}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">Total: {order.totalLabel}</p>
      <div className="mt-8 text-sm text-ink-soft">
        <p className="text-ink">Delivery</p>
        <p className="mt-2">
          {order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city},{" "}
          {order.shippingAddress.state} {order.shippingAddress.pincode}
        </p>
        <p className="mt-4">Tracking: updates will appear here after dispatch.</p>
      </div>
    </div>
  );
}
