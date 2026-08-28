"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { ReviewModal } from "@/components/review/ReviewModal";

type Order = {
  id: string;
  createdAt: string;
  items: { name: string; qty: number; image: string; sku: string }[];
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
  CANCELLED: "bg-red-50 text-red-800",
};

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [modalProduct, setModalProduct] = useState<{ sku: string; name: string; reviewId?: string | null } | null>(null);

  useEffect(() => {
    void fetch(`/api/customer/orders/${params.orderId}`, { credentials: "include" }).then(async (res) => {
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok) setError(data.error || "Order not found.");
      else setOrder(data.order || null);
    });

    if (order?.paymentStatus === "PAID") {
      void fetch(`/api/customer/orders/${params.orderId}/reviews`, { credentials: "include" })
        .then((r) => r.json())
        .then((status: ReviewStatus) => setReviewStatus(status))
        .catch(() => undefined);
    }
  }, [params.orderId, order?.paymentStatus]);

  if (error) return <p className="px-4 py-16">{error}</p>;
  if (!order) return <p className="px-4 py-16">Loading...</p>;

  function getReviewButton(item: Order["items"][0]) {
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Order {order.id}</h1>
        <span className={`text-[11px] tracking-[0.12em] uppercase ${statusColor[order.paymentStatus] || "bg-cream text-ink-soft"}`}>
          {order.paymentStatus}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {new Date(order.createdAt).toLocaleString("en-IN")} · Status {order.orderStatus}
      </p>
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {order.items.map((i) => (
          <li key={i.sku} className="flex items-center gap-4 p-4">
            <div className="relative aspect-square w-14 shrink-0 overflow-hidden bg-cream">
              <AssetImage src={i.image} alt={i.name} fill className="object-cover object-center" sizes="56px" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{i.name}</p>
              <p className="text-xs text-ink-soft">Qty: {i.qty}</p>
            </div>
            {order.paymentStatus === "PAID" && (
              <div className="shrink-0">{getReviewButton(i)}</div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-right font-medium">Total: {order.totalLabel}</p>
      <div className="mt-8 border border-ink/10 bg-paper p-6">
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
              {order.shippedAt ? (
                <span> Shipped {new Date(order.shippedAt).toLocaleDateString("en-IN")}.</span>
              ) : null}
              {order.deliveredAt ? (
                <span> Delivered {new Date(order.deliveredAt).toLocaleDateString("en-IN")}.</span>
              ) : null}
            </>
          ) : (
            "Tracking updates will appear here after dispatch."
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
            void fetch(`/api/customer/orders/${params.orderId}/reviews`, { credentials: "include" })
              .then((r) => r.json())
              .then((status: ReviewStatus) => setReviewStatus(status))
              .catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
