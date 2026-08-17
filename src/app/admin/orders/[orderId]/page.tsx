"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AssetImage } from "@/components/AssetImage";
import { fieldClass } from "@/components/AuthShell";
import { allowedNextStatuses, isOrderStatus } from "@/lib/db/order-status";

type AdminOrder = {
  id: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  totalLabel: string;
  shippingProvider: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  customer: { fullName: string; email: string; phone: string };
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
  items: { sku: string; name: string; qty: number; image: string; unitPrice: number | null }[];
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/orders/${params.orderId}`, { credentials: "include" });
    const data = (await res.json()) as { order?: AdminOrder; error?: string };
    if (!res.ok) setError(data.error || "Order not found.");
    else setOrder(data.order || null);
  }

  useEffect(() => {
    void load();
  }, [params.orderId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!order) return;
    setPending(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderStatus: String(form.get("orderStatus") || order.orderStatus),
        shippingProvider: form.get("shippingProvider"),
        trackingNumber: form.get("trackingNumber"),
      }),
    });
    const data = (await res.json()) as { error?: string; order?: AdminOrder };
    setPending(false);
    if (!res.ok) {
      setMessage(data.error || "Something went wrong. Please try again.");
      return;
    }
    setOrder(data.order || order);
    setMessage("Order updated.");
  }

  if (error) return <p className="px-4 py-16">{error}</p>;
  if (!order) return <p className="px-4 py-16">Loading...</p>;

  const next = isOrderStatus(order.orderStatus) ? allowedNextStatuses(order.orderStatus) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link href="/admin/orders" className="text-xs uppercase tracking-[0.16em] underline">
        Orders
      </Link>
      <h1 className="mt-4 font-serif text-4xl">Order {order.id}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {new Date(order.createdAt).toLocaleString("en-IN")} · {order.orderStatus} · {order.paymentStatus}
      </p>

      <section className="mt-8 text-sm">
        <h2 className="font-serif text-2xl">Customer</h2>
        <p className="mt-2">{order.customer.fullName}</p>
        <p className="text-ink-soft">{order.customer.email}</p>
        <p className="text-ink-soft">{order.customer.phone}</p>
      </section>

      <section className="mt-8 text-sm">
        <h2 className="font-serif text-2xl">Shipping address</h2>
        <p className="mt-2">
          {order.shippingAddress.fullName}, {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.city},{" "}
          {order.shippingAddress.state} {order.shippingAddress.pincode}
        </p>
        <p className="text-ink-soft">{order.shippingAddress.phone}</p>
        {order.shippingAddress.landmark ? <p className="text-ink-soft">{order.shippingAddress.landmark}</p> : null}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Items</h2>
        <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
          {order.items.map((item) => (
            <li key={item.sku} className="flex items-center gap-4 p-4 text-sm">
              <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden bg-cream">
                <AssetImage src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
              </div>
              <div className="flex-1">
                <p>{item.name}</p>
                <p className="text-xs text-ink-soft">{item.sku}</p>
              </div>
              <span>× {item.qty}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">Total: {order.totalLabel}</p>
        <p className="text-sm text-ink-soft">Payment: {order.paymentStatus}</p>
      </section>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-4">
        <h2 className="font-serif text-2xl">Delivery</h2>
        <label className="block text-sm">
          Order status
          <select name="orderStatus" defaultValue={order.orderStatus} className={fieldClass} key={order.orderStatus}>
            <option value={order.orderStatus}>{order.orderStatus}</option>
            {next.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Courier
          <input
            name="shippingProvider"
            defaultValue={order.shippingProvider || ""}
            placeholder="DTDC"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          Tracking / AWB number
          <input
            name="trackingNumber"
            defaultValue={order.trackingNumber || ""}
            placeholder="ABC123456"
            className={fieldClass}
          />
        </label>
        {order.shippedAt ? (
          <p className="text-sm text-ink-soft">Shipped: {new Date(order.shippedAt).toLocaleString("en-IN")}</p>
        ) : null}
        {order.deliveredAt ? (
          <p className="text-sm text-ink-soft">Delivered: {new Date(order.deliveredAt).toLocaleString("en-IN")}</p>
        ) : null}
        {message ? <p className="text-sm">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="h-12 bg-ink px-8 text-[12px] tracking-[0.18em] text-paper uppercase disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
