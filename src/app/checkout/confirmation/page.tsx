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

function Confirmation() {
  const orderId = useSearchParams().get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const stored = sessionStorage.getItem(`dandy-order-${orderId}`);
    if (stored) {
      try {
        setOrder(JSON.parse(stored));
        setVerified(true);
      } catch {
        // ignore
      }
      return;
    }
    fetch(`/api/customer/orders/${orderId}`, { credentials: "include" })
      .then(async (r) => {
        const data = (await r.json()) as { order?: Order; error?: string };
        if (r.ok && data.order) {
          setOrder(data.order);
          setVerified(true);
          sessionStorage.setItem(`dandy-order-${orderId}`, JSON.stringify(data.order));
        }
      })
      .catch(() => {
        // guest will use phone verification instead
      });
  }, [orderId]);

  async function verifyPhone(e: React.FormEvent<HTMLFormElement>) {
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
        setVerified(true);
        sessionStorage.setItem(`dandy-order-${orderId}`, JSON.stringify(data.order));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-4xl">Order placed successfully.</h1>
      {orderId && (
        <p className="mt-3 text-sm text-ink-soft">
          Order ID: <span className="font-medium text-ink">{orderId}</span>
        </p>
      )}

      {!verified && orderId ? (
        <form onSubmit={verifyPhone} className="mx-auto mt-8 max-w-sm space-y-4 text-left">
          <p className="text-sm text-ink-soft">Verify your order using the phone number used for checkout.</p>
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
            {loading ? "Verifying..." : "View Order"}
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
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/guest-order?orderId=${order.id}`}
              className="inline-flex h-12 items-center justify-center border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream"
            >
              Track Order
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : null}
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
