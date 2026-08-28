"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Order = {
  id: string;
  createdAt: string;
  items: { name: string; qty: number; image: string }[];
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
  shippingProvider: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
  };
};

const statusColor: Record<string, string> = {
  PENDING: "bg-cream text-ink-soft",
  PAID: "bg-camel/20 text-ink",
  PLACED: "bg-ink/10 text-ink",
  CANCELLED: "bg-red-50 text-red-800",
  FAILED: "bg-red-50 text-red-800",
};

function GuestOrderLookup() {
  const params = useSearchParams();
  const initialOrderId = params.get("orderId") || "";
  const [orderId, setOrderId] = useState(initialOrderId);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialOrderId) {
      setOrderId(initialOrderId);
    }
  }, [initialOrderId]);

  async function lookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orderId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/guest/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok) {
        setError(data.error || "Order not found.");
        return;
      }
      if (data.order) {
        setOrder(data.order);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-4xl">Track Order</h1>
      <p className="mt-3 text-sm text-ink-soft">Enter your order ID and phone number to look up your order.</p>

      {!order ? (
        <form onSubmit={lookup} className="mx-auto mt-8 max-w-sm space-y-4 text-left">
          <label className="block text-sm">
            Order ID *
            <input
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
              placeholder="DND-12345678"
            />
          </label>
          <label className="block text-sm">
            Phone number *
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
              placeholder="10-digit mobile"
            />
          </label>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {loading ? "Looking up..." : "Track Order"}
          </button>
        </form>
      ) : null}

      {order ? (
        <div className="mt-8 text-left text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">Order ID: {order.id}</p>
            <span className={`text-[11px] tracking-[0.12em] uppercase ${statusColor[order.paymentStatus] || "bg-cream text-ink-soft"}`}>
              {order.paymentStatus}
            </span>
          </div>
          <p className="mt-1 text-ink-soft">
            {new Date(order.createdAt).toLocaleString("en-IN")} · Status {order.orderStatus}
          </p>
          <p className="mt-4 font-medium">Delivery</p>
          <p className="mt-1 text-sm text-ink-soft">
            {order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city},{" "}
            {order.shippingAddress.state} {order.shippingAddress.pincode}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {order.shippingProvider || order.trackingNumber ? (
              <>
                {order.shippingProvider ? <span>Courier: {order.shippingProvider}. </span> : null}
                {order.trackingNumber ? <span>Tracking: {order.trackingNumber}.</span> : null}
                {order.shippedAt ? <span> Shipped {new Date(order.shippedAt).toLocaleDateString("en-IN")}.</span> : null}
                {order.deliveredAt ? <span> Delivered {new Date(order.deliveredAt).toLocaleDateString("en-IN")}.</span> : null}
              </>
            ) : (
              "Tracking updates will appear here after dispatch."
            )}
          </p>
          <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
            {order.items.map((i) => (
              <li key={i.name} className="flex items-center gap-4 p-4">
                <div className="relative aspect-square w-14 shrink-0 overflow-hidden bg-cream">
                  <img src={i.image} alt={i.name} className="object-cover" sizes="56px" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-ink-soft">Qty: {i.qty}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-right font-medium">Total: {order.totalLabel}</p>
          <div className="mt-6">
            <Link href="/shop" className="inline-flex h-12 items-center justify-center border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream">
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function GuestOrderPage() {
  return (
    <Suspense>
      <GuestOrderLookup />
    </Suspense>
  );
}
