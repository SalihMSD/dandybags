"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Order = {
  id: string;
  totalLabel: string;
  items: { name: string; qty: number }[];
  shippingAddress: { fullName: string; city: string; state: string; pincode: string; line1: string };
};

function Confirmation() {
  const orderId = useSearchParams().get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    void fetch(`/api/customer/orders/${orderId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { order: Order }) => setOrder(d.order));
  }, [orderId]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-4xl">Order placed successfully.</h1>
      {order ? (
        <div className="mt-8 text-left text-sm">
          <p>Order ID: {order.id}</p>
          <p className="mt-2">Total: {order.totalLabel}</p>
          <p className="mt-4 text-ink-soft">
            Delivery to {order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city}{" "}
            {order.shippingAddress.pincode}
          </p>
          <ul className="mt-4">
            {order.items.map((i) => (
              <li key={i.name}>
                {i.name} × {i.qty}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link href="/account/orders" className="mt-10 inline-block underline underline-offset-4">
        View orders
      </Link>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <Confirmation />
    </Suspense>
  );
}
