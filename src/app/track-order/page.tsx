"use client";

import { Suspense, useEffect, useState } from "react";
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

function TrackOrderContent() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok) {
        setError(data.error || "Order not found.");
        return;
      }
      setOrder(data.order || null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-4xl">Track Order</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Enter your order ID and the phone number used for the order.
      </p>

      <form onSubmit={lookup} className="mx-auto mt-8 max-w-sm space-y-4 text-left">
        <label className="block text-sm">
          Order ID *
          <input
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.trim())}
            className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
            placeholder="DND-XXXXXXXX"
          />
        </label>
        <p className="text-xs text-ink-soft">
          <span className="font-medium">Where can I find my Order ID?</span> Your Order ID is shown on your order confirmation page. Order confirmation email support will be available when transactional order emails are enabled.
        </p>
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
          {loading ? "Tracking..." : "Track Order"}
        </button>
        <p className="text-center text-xs text-ink-soft">
          Can&apos;t find your Order ID?{" "}
          <Link href="/contact" className="underline underline-offset-4">Contact DANDY Support</Link>.
        </p>
      </form>

      {order ? (
        <div className="mt-8 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">Order ID: {order.id}</p>
            <span className={`text-[11px] tracking-[0.12em] uppercase ${statusColor[order.paymentStatus] || "bg-cream text-ink-soft"}`}>
              {order.paymentStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {new Date(order.createdAt).toLocaleString("en-IN")} · Status {order.orderStatus}
          </p>
          <ul className="mt-6 divide-y divide-ink/10 border border-ink/10">
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
          <div className="mt-6 border border-ink/10 bg-paper p-6">
            <p className="text-xs uppercase tracking-[0.16em]">Delivery</p>
            <p className="mt-3 text-sm">
              {order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.state} {order.shippingAddress.pincode}
            </p>
            <p className="mt-4 text-sm text-ink-soft">
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
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setOrder(null)}
              className="inline-flex h-12 items-center justify-center border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream"
            >
              Track Another Order
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense>
      <TrackOrderContent />
    </Suspense>
  );
}
