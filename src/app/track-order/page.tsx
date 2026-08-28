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
  const [step, setStep] = useState<"phone" | "otp" | "orders" | "detail">("phone");
  const [phone, setPhone] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  async function fetchOrders(id: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/track/orders", {
        headers: { "x-tracking-id": id },
      });
      const data = (await res.json()) as { orders?: Order[]; error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to load orders.");
        return;
      }
      setOrders(data.orders || []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("dandy-track");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.trackingId && data.phone) {
          setTrackingId(data.trackingId);
          setPhone(data.phone);
          setStep("orders");
          fetchOrders(data.trackingId);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  async function requestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/track/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; trackingId?: string; code?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to send OTP.");
        return;
      }
      setTrackingId(data.trackingId || "");
      setCode(data.code || "");
      setOtpSent(true);
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/track/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingId, code: otp }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; phone?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid OTP.");
        return;
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("dandy-track", JSON.stringify({ trackingId, phone: data.phone }));
      }
      setStep("orders");
      fetchOrders(trackingId);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function viewOrder(orderId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/track/orders/${orderId}`, {
        headers: { "x-tracking-id": trackingId },
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok) {
        setError(data.error || "Order not found.");
        return;
      }
      setOrder(data.order || null);
      setStep("detail");
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
        Enter your phone number to look up your orders.
      </p>

      {step === "phone" ? (
        <form onSubmit={requestOtp} className="mx-auto mt-8 max-w-sm space-y-4 text-left">
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
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={verifyOtp} className="mx-auto mt-8 max-w-sm space-y-4 text-left">
          <p className="text-sm text-ink-soft">
            Enter the OTP sent to {phone}.
            {code && <span className="mt-2 inline-block font-medium text-ink"> (Staging OTP: {code})</span>}
          </p>
          <label className="block text-sm">
            OTP *
            <input
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
              placeholder="6-digit OTP"
            />
          </label>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="h-12 w-full border border-ink text-[12px] tracking-[0.2em] uppercase hover:bg-cream"
          >
            Change phone number
          </button>
        </form>
      ) : null}

      {step === "orders" && orders.length === 0 && !loading ? (
        <div className="mt-8">
          <p className="text-sm text-ink-soft">No orders found for this phone number.</p>
          <Link href="/shop" className="mt-6 inline-block h-12 border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream">
            Continue Shopping
          </Link>
        </div>
      ) : null}

      {step === "orders" && orders.length > 0 ? (
        <div className="mt-8 text-left">
          <p className="mb-4 text-sm text-ink-soft">{orders.length} order(s) found.</p>
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="border border-ink/10 bg-paper">
                <button
                  type="button"
                  onClick={() => viewOrder(o.id)}
                  className="flex w-full items-center justify-between border-b border-ink/5 px-4 py-3 text-left hover:bg-cream"
                >
                  <div>
                    <p className="font-serif text-lg">{o.id}</p>
                    <p className="text-xs text-ink-soft">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className={`text-[11px] tracking-[0.12em] uppercase ${statusColor[o.paymentStatus] || "bg-cream text-ink-soft"}`}>
                    {o.paymentStatus}
                  </span>
                </button>
                <div className="px-4 py-3">
                  {o.items.map((i) => (
                    <div key={i.name} className="flex items-center gap-3 py-2">
                      <div className="relative aspect-square w-10 shrink-0 overflow-hidden bg-cream">
                        <img src={i.image} alt={i.name} className="object-cover" sizes="40px" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="line-clamp-1">{i.name}</p>
                        <p className="text-xs text-ink-soft">Qty: {i.qty}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-ink/5 px-4 py-3 text-sm">
                  <span className="text-ink-soft">{o.orderStatus}</span>
                  <span className="font-medium">{o.totalLabel}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === "detail" && order ? (
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
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep("orders")}
              className="h-12 border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream"
            >
              Back to Orders
            </button>
            <Link href="/shop" className="h-12 bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase text-center">
              Continue Shopping
            </Link>
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
