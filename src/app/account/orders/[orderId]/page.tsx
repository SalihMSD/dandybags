"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { ReviewModal } from "@/components/review/ReviewModal";
import { formatInr } from "@/lib/format";

type OrderItem = {
  sku: string;
  name: string;
  qty: number;
  image: string;
  unitPrice: number | null;
};

type Order = {
  id: string;
  createdAt: string;
  items: OrderItem[];
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
  };
};

type ReviewStatus = {
  orderId: string;
  items: { sku: string; name: string; qty: number; image: string; reviewStatus: string; reviewId: string | null }[];
};

const statusColor: Record<string, string> = {
  PENDING: "bg-cream text-ink-soft",
  PAID: "bg-camel/20 text-ink",
  PLACED: "bg-ink/10 text-ink",
  CONFIRMED: "bg-camel/20 text-ink",
  SHIPPED: "bg-camel/20 text-ink",
  DELIVERED: "bg-green-50 text-green-800",
  CANCELLED: "bg-red-50 text-red-800",
};

const STATUS_STEPS = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [modalProduct, setModalProduct] = useState<{ sku: string; name: string; reviewId?: string | null } | null>(null);

  useEffect(() => {
    if (!params.orderId) return;
    void fetch(`/api/customer/orders/${params.orderId}`, { credentials: "include" }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Order not found.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { order?: Order };
      setOrder(data.order || null);
      setLoading(false);
    });
  }, [params.orderId]);

  useEffect(() => {
    if (order?.paymentStatus === "PAID" && params.orderId) {
      void fetch(`/api/customer/orders/${params.orderId}/reviews`, { credentials: "include" })
        .then((r) => r.json())
        .then((status: ReviewStatus) => setReviewStatus(status))
        .catch(() => undefined);
    }
  }, [order, params.orderId]);

  function getReviewButton(item: OrderItem) {
    const itemReview = reviewStatus?.items.find((i) => i.sku === item.sku);
    const reviewStatusValue = itemReview?.reviewStatus || "NOT_REVIEWED";

    if (reviewStatusValue === "APPROVED") {
      return (
        <button
          type="button"
          onClick={() => setModalProduct({ sku: item.sku, name: item.name, reviewId: itemReview?.reviewId || null })}
          className="h-8 border border-ink px-3 text-[10px] tracking-[0.14em] uppercase hover:bg-cream"
        >
          Edit Review
        </button>
      );
    }
    if (reviewStatusValue === "PENDING") {
      return <span className="text-xs text-ink-soft">Review pending</span>;
    }
    if (reviewStatusValue === "HIDDEN") {
      return <span className="text-xs text-ink-soft">Review hidden</span>;
    }
    return (
      <button
        type="button"
        onClick={() => setModalProduct({ sku: item.sku, name: item.name })}
        className="h-8 bg-camel px-3 text-[10px] tracking-[0.14em] uppercase"
      >
        Write Review
      </button>
    );
  }

  const displayItems = order ? order.items.map((item) => {
    const unitPrice = item.unitPrice ?? 0;
    const lineTotal = unitPrice * item.qty;
    return { ...item, unitPrice, lineTotal };
  }) : [];

  const subtotal = displayItems.reduce((sum, i) => sum + i.lineTotal, 0);

  if (loading) return <p className="px-4 py-16 text-sm text-ink-soft">Loading order…</p>;
  if (error) return <p className="px-4 py-16 text-sm text-red-800">{error}</p>;
  if (!order) return <p className="px-4 py-16 text-sm text-ink-soft">Order not found.</p>;

  const currentStepIndex = STATUS_STEPS.indexOf(order.orderStatus as (typeof STATUS_STEPS)[number]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Order {order.id}</h1>
        <span className={`text-[11px] tracking-[0.12em] uppercase ${statusColor[order.paymentStatus] || "bg-cream text-ink-soft"}`}>
          {order.paymentStatus}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {new Date(order.createdAt).toLocaleString("en-IN")} · Status: {order.orderStatus}
      </p>

      <div className="mt-8 rounded border border-ink/10 bg-paper p-6">
        <h2 className="font-serif text-xl">Status Timeline</h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isFuture = idx > currentStepIndex;
            let dotClass = "bg-ink-soft";
            if (isCompleted) dotClass = "bg-green-800";
            if (isCurrent) dotClass = "bg-camel";
            if (isFuture) dotClass = "bg-ink/10";
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs text-paper ${dotClass}`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span className="mt-1 text-xs text-ink-soft">{step}</span>
              </div>
            );
          })}
        </div>
        {order.orderStatus === "CANCELLED" && (
          <p className="mt-4 text-sm text-red-800">This order has been cancelled.</p>
        )}
      </div>

      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {displayItems.map((i) => (
          <li key={i.sku} className="flex items-center gap-4 p-4">
            <div className="relative aspect-square w-14 shrink-0 overflow-hidden bg-cream">
              <AssetImage src={i.image} alt={i.name} fill className="object-cover object-center" sizes="56px" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{i.name}</p>
              <p className="text-xs text-ink-soft">SKU: {i.sku} · Qty: {i.qty}</p>
            </div>
            <div className="text-right text-sm">
              <p>{i.unitPrice ? formatInr(i.unitPrice) : "—"}</p>
              <p className="font-medium">{i.unitPrice ? formatInr(i.lineTotal) : "—"}</p>
            </div>
            {order.paymentStatus === "PAID" && order.orderStatus === "DELIVERED" && (
              <div className="shrink-0">{getReviewButton(i)}</div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm space-y-2 border-t border-ink/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatInr(subtotal)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-medium">
            <span>Total</span>
            <span>{order.totalLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 border border-ink/10 bg-paper p-6">
        <h2 className="font-serif text-xl">Delivery Address</h2>
        <p className="mt-3 text-sm">
          {order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city},{" "}
          {order.shippingAddress.state} {order.shippingAddress.pincode}
        </p>
        <p className="mt-1 text-sm text-ink-soft">Phone: {order.shippingAddress.phone}</p>
      </div>

      <div className="mt-6 border border-ink/10 bg-paper p-6">
        <h2 className="font-serif text-xl">Shipping</h2>
        <p className="mt-3 text-sm">
          {order.shippingProvider || order.trackingNumber ? (
            <>
              {order.shippingProvider ? <span>Courier: {order.shippingProvider}. </span> : null}
              {order.trackingNumber ? <span>Tracking: {order.trackingNumber}.</span> : null}
              {order.shippedAt ? <span> Shipped {new Date(order.shippedAt).toLocaleDateString("en-IN")}.</span> : null}
              {order.deliveredAt ? <span> Delivered {new Date(order.deliveredAt).toLocaleDateString("en-IN")}.</span> : null}
            </>
          ) : (
            <span className="text-ink-soft">Tracking details will appear here after dispatch.</span>
          )}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/track-order"
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

      {modalProduct && (
        <ReviewModal
          productSku={modalProduct.sku}
          productName={modalProduct.name}
          orderId={params.orderId}
          existingReview={modalProduct.reviewId ? { id: modalProduct.reviewId, rating: 0, title: "", comment: "", status: "PENDING" } : null}
          onClose={() => setModalProduct(null)}
          onSuccess={() => {
            setModalProduct(null);
          }}
        />
      )}
    </div>
  );
}
