"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AssetImage } from "@/components/AssetImage";
import { allowedNextStatuses, isOrderStatus } from "@/lib/db/order-status";
import { formatInr } from "@/lib/format";

type AdminOrderItem = {
  sku: string;
  name: string;
  qty: number;
  image: string;
  unitPrice: number | null;
};

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
  items: AdminOrderItem[];
  refund: {
    id: string;
    status: string;
    razorpayRefundId: string | null;
    amount: number;
    failureReason: string | null;
    completedAt: string | null;
  } | null;
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!params.orderId) return;
    void fetch(`/api/admin/orders/${params.orderId}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Order not found.");
        } else {
          const data = (await res.json()) as { order?: AdminOrder };
          setOrder(data.order || null);
        }
      })
      .catch(() => setError("Something went wrong. Please try again."))
      .finally(() => setLoading(false));
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
      setMessage(data.error || "Something went wrong.");
      return;
    }
    setOrder(data.order || order);
    setMessage("Order updated.");
  }

  async function handleCancelAndRefund() {
    if (!order) return;
    setCancelPending(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Cancellation failed.");
      } else {
        const refundStatus = data.refundStatus;
        if (refundStatus === "SUCCESS") {
          setMessage("Order cancelled. Refund processed successfully.");
        } else if (refundStatus === "PROCESSING") {
          setMessage("Order cancelled. Refund is processing.");
        } else if (refundStatus === "already_refunded") {
          setMessage("Order cancelled. Refund already applied.");
        } else if (refundStatus === "not_applicable") {
          setMessage("Order cancelled. No refund required.");
        } else {
          setMessage(data.refundError || "Order cancelled. Refund pending.");
        }
        setOrder((prev) =>
          prev ? { ...prev, orderStatus: "CANCELLED" } : null,
        );
      }
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setCancelPending(false);
      setShowCancelConfirm(false);
    }
  }

  async function handleRetryRefund() {
    if (!order) return;
    setCancelPending(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_refund" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Refund retry failed.");
       } else {
        const status = data.refundStatus;
        if (status === "SUCCESS") {
          setMessage("Refund completed successfully.");
        } else if (status === "PROCESSING") {
          setMessage("Refund is being processed.");
        } else if (status === "PENDING") {
          setMessage("Refund is pending.");
        } else {
          setMessage("Refund retried.");
        }
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                refund: prev.refund
                  ? { ...prev.refund, status: status === "SUCCESS" ? "SUCCESS" : status === "PROCESSING" ? "PROCESSING" : prev.refund.status }
                  : null,
              }
            : null,
        );
      }
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setCancelPending(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading order…</p>;
  if (error) return <p className="text-sm text-red-800">{error}</p>;
  if (!order) return <p className="text-sm text-ink-soft">Order not found.</p>;

  const next = isOrderStatus(order.orderStatus) ? allowedNextStatuses(order.orderStatus) : [];

  const displayItems = order.items.map((item) => {
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : 0;
    const lineTotal = unitPrice * item.qty;
    return { ...item, unitPrice, lineTotal };
  });

  const subtotal = displayItems.reduce((sum, i) => sum + i.lineTotal, 0);

  const STATUS_STEPS = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;
  const currentStepIndex = STATUS_STEPS.indexOf(order.orderStatus as (typeof STATUS_STEPS)[number]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-xs uppercase tracking-[0.16em] text-ink-soft underline">Orders</Link>
          <h1 className="mt-2 font-serif text-3xl">{order.id}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded bg-paper border border-ink/10 px-3 py-1 text-xs ${
            order.paymentStatus === "PAID" ? "text-green-800" : "text-ink"
          }`}>
            Payment: {order.paymentStatus}
          </span>
          <span className="rounded bg-paper border border-ink/10 px-3 py-1 text-xs">
            Status: {order.orderStatus}
          </span>
        </div>
      </div>

      {order.refund && (
        <div className="rounded border border-ink/10 bg-paper p-4">
          <p className="font-serif text-lg">
            Refund:{" "}
            <span className={
              order.refund.status === "SUCCESS"
                ? "text-green-800"
                : order.refund.status === "FAILED"
                ? "text-red-800"
                : order.refund.status === "PROCESSING"
                ? "text-amber-800"
                : "text-ink"
            }>
            {order.refund.status === "PROCESSING" ? "PROCESSING" : order.refund.status}
          </span>
          </p>
          {order.refund.razorpayRefundId ? (
            <p className="text-xs text-ink-soft">Razorpay Refund ID: {order.refund.razorpayRefundId}</p>
          ) : null}
          {order.refund.failureReason ? (
            <p className="text-xs text-red-800">Failure: {order.refund.failureReason}</p>
          ) : null}
          {order.refund.completedAt ? (
            <p className="text-xs text-ink-soft">Completed: {new Date(order.refund.completedAt).toLocaleString("en-IN")}</p>
          ) : null}
          {(order.refund.status === "FAILED" || order.refund.status === "PENDING") && order.paymentStatus === "PAID" && (
            <button
              type="button"
              onClick={() => void handleRetryRefund()}
              disabled={cancelPending}
              className="mt-2 h-8 bg-ink px-4 text-[10px] tracking-[0.16em] uppercase text-paper disabled:opacity-60"
            >
              {cancelPending ? "Retrying…" : "Retry Refund"}
            </button>
          )}
        </div>
      )}

      {order.orderStatus === "PLACED" && order.paymentStatus === "PAID" && !order.refund && (
        <div className="rounded border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            This is a paid order. Cancelling will initiate a refund via Razorpay.
          </p>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            disabled={cancelPending}
            className="mt-2 h-9 bg-red-800 px-4 text-[11px] tracking-[0.16em] uppercase text-paper disabled:opacity-60"
          >
            {cancelPending ? "Processing…" : "Cancel & Refund"}
          </button>
        </div>
      )}

      {order.orderStatus === "PLACED" && order.paymentStatus === "PENDING" && (
        <div className="rounded border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            This order has not been paid. Cancelling will not trigger a refund.
          </p>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            disabled={cancelPending}
            className="mt-2 h-9 bg-red-800 px-4 text-[11px] tracking-[0.16em] uppercase text-paper disabled:opacity-60"
          >
            {cancelPending ? "Processing…" : "Cancel Order"}
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-xl">Customer</h2>
          <p className="mt-2 font-medium">{order.customer.fullName}</p>
          <p className="text-sm text-ink-soft">{order.customer.email}</p>
          <p className="text-sm text-ink-soft">{order.customer.phone}</p>
        </div>

        <div>
          <h2 className="font-serif text-xl">Shipping Address</h2>
          <p className="mt-2">
            {order.shippingAddress.fullName}, {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.city},{" "}
            {order.shippingAddress.state} {order.shippingAddress.pincode}
          </p>
          <p className="text-sm text-ink-soft">Phone: {order.shippingAddress.phone}</p>
          {order.shippingAddress.landmark ? <p className="text-sm text-ink-soft">Landmark: {order.shippingAddress.landmark}</p> : null}
        </div>
      </div>

      {order.orderStatus === "CANCELLED" ? (
        <div className="rounded border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Order has been cancelled.</p>
          {order.refund && order.paymentStatus === "PAID" ? (
            <p className="mt-1 text-xs text-ink-soft">
              Refund status: {order.refund.status}
              {order.refund.razorpayRefundId ? ` (Razorpay: ${order.refund.razorpayRefundId})` : ""}
            </p>
          ) : order.paymentStatus === "PAID" ? (
            <p className="mt-1 text-xs text-red-800">Refund is being processed. Please manually refund via Razorpay.</p>
          ) : (
            <p className="mt-1 text-xs text-ink-soft">No refund required (order was not paid).</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;
            let statusClass = "bg-ink-soft";
            if (isCompleted) statusClass = "bg-green-800";
            if (isCurrent) statusClass = "bg-camel";
            if (isPending) statusClass = "bg-ink/10";
            let labelClass = "text-ink-soft";
            if (isCompleted) labelClass = "text-green-800 font-medium";
            if (isCurrent) labelClass = "text-ink font-medium";
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs text-paper ${statusClass}`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span className={`mt-1 ${labelClass}`}>{step}</span>
              </div>
            );
          })}
        </div>
      )}

      <section>
        <h2 className="font-serif text-xl">Items</h2>
        <div className="mt-4 overflow-x-auto rounded border border-ink/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="py-2">Product</th>
                <th>SKU</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item) => (
                <tr key={item.sku} className="border-b border-ink/5">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative aspect-[4/5] h-12 w-12 overflow-hidden bg-cream">
                        <AssetImage src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                      </div>
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{item.sku}</td>
                  <td className="text-center">{item.qty}</td>
                  <td className="text-right">{item.unitPrice ? formatInr(item.unitPrice) : "—"}</td>
                  <td className="text-right font-medium">
                    {item.unitPrice ? formatInr(item.lineTotal) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal ({displayItems.reduce((s, i) => s + i.qty, 0)} items)</span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-medium">
              <span>Order Total</span>
              <span>{order.totalLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl">Fulfillment</h2>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4">
          {message ? <p className="text-sm text-green-800">{message}</p> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              Order Status
              <select name="orderStatus" defaultValue={order.orderStatus} className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm">
                <option value={order.orderStatus}>{order.orderStatus}</option>
                {next.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Courier
              <input name="shippingProvider" defaultValue={order.shippingProvider || ""} placeholder="DTDC, Blue Dart, etc." className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Tracking Number
              <input name="trackingNumber" defaultValue={order.trackingNumber || ""} placeholder="ABC123456" className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm" />
            </label>
          </div>

          {order.shippedAt ? (
            <p className="text-xs text-ink-soft">Shipped: {new Date(order.shippedAt).toLocaleString("en-IN")}</p>
          ) : null}
          {order.deliveredAt ? (
            <p className="text-xs text-ink-soft">Delivered: {new Date(order.deliveredAt).toLocaleString("en-IN")}</p>
          ) : null}

          <button type="submit" disabled={pending} className="h-10 bg-ink px-5 text-[11px] tracking-[0.16em] uppercase text-paper disabled:opacity-60">
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded border border-ink/10 bg-paper p-6 shadow-lg">
            <h3 className="font-serif text-xl">
              {order.paymentStatus === "PAID"
                ? "Cancel and refund this order?"
                : "Cancel this order?"}
            </h3>
            <p className="mt-3 text-sm text-ink-soft">
              {order.paymentStatus === "PAID"
                ? "This will cancel the order and initiate a full refund via Razorpay. Stock will be restored. Refund processing may take 5–7 business days."
                : "This will cancel the order without any payment/refund action. Stock will be restored."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelPending}
                className="inline-flex h-12 items-center justify-center border border-ink/15 px-6 text-[12px] tracking-[0.16em] uppercase hover:bg-cream disabled:opacity-60"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => void handleCancelAndRefund()}
                disabled={cancelPending}
                className="inline-flex h-12 items-center justify-center border border-red-800 bg-red-800 px-6 text-[12px] tracking-[0.16em] uppercase text-paper hover:bg-red-900 disabled:opacity-60"
              >
                {cancelPending ? "Processing…" : order.paymentStatus === "PAID" ? "Yes, Cancel & Refund" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
