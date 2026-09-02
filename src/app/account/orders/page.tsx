"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { ReviewModal } from "@/components/review/ReviewModal";

type Order = {
  id: string;
  createdAt: string;
  items: { name: string; qty: number; image: string; sku: string; reviewStatus?: string; reviewId?: string | null }[];
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewStatuses, setReviewStatuses] = useState<Map<string, ReviewStatus>>(new Map());
  const [modalOrderId, setModalOrderId] = useState<string | null>(null);
  const [modalProduct, setModalProduct] = useState<{ sku: string; name: string; reviewId?: string | null } | null>(null);

  useEffect(() => {
    void fetch("/api/customer/orders", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          setError(data.error || "Failed to load orders.");
          return;
        }
        const d: { orders: Order[] } = await r.json();
        const ordersList = d.orders || [];
        setOrders(ordersList);

        for (const order of ordersList) {
          if (order.paymentStatus === "PAID") {
            void fetch(`/api/customer/orders/${order.id}/reviews`, { credentials: "include" })
              .then((r2) => r2.json())
              .then((status: ReviewStatus) => {
                setReviewStatuses((prev) => {
                  const next = new Map(prev);
                  next.set(status.orderId, status);
                  return next;
                });
              })
              .catch(() => undefined);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function openReviewModal(orderId: string, sku: string, name: string, reviewId: string | null) {
    setModalOrderId(orderId);
    setModalProduct({ sku, name, reviewId });
  }

  function getReviewButton(order: Order, item: Order["items"][0]) {
    const status = reviewStatuses.get(order.id)?.items.find((i) => i.sku === item.sku);
    const reviewStatusValue = status?.reviewStatus || "NOT_REVIEWED";

    if (reviewStatusValue === "APPROVED") {
      return (
        <button
          type="button"
          onClick={() => openReviewModal(order.id, item.sku, item.name, status?.reviewId || null)}
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
        onClick={() => openReviewModal(order.id, item.sku, item.name, null)}
        className="h-8 bg-camel px-3 text-[10px] tracking-[0.14em] uppercase"
      >
        Write Review
      </button>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
        <h1 className="font-serif text-4xl">My Orders</h1>
        <p className="mt-6 text-sm text-ink-soft">Loading your orders…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
        <h1 className="font-serif text-4xl">My Orders</h1>
        <p className="mt-6 text-sm text-red-800">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 h-10 bg-ink px-4 text-[11px] tracking-[0.16em] uppercase text-paper">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">My Orders</h1>
      {orders.length === 0 ? (
        <div className="mt-8 rounded border border-ink/10 bg-paper p-8 text-center">
          <p className="text-sm text-ink-soft">You haven't placed any orders yet.</p>
          <Link href="/shop" className="mt-4 inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase">
            Shop Bags
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border border-ink/10 bg-paper">
              <Link href={`/account/orders/${o.id}`} className="flex items-center justify-between border-b border-ink/5 px-4 py-3 hover:bg-cream">
                <div>
                  <p className="font-serif text-lg">{o.id}</p>
                  <p className="text-xs text-ink-soft">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <span className={`text-[11px] tracking-[0.12em] uppercase ${statusColor[o.paymentStatus] || "bg-cream text-ink-soft"}`}>
                  {o.paymentStatus}
                </span>
              </Link>
              <div className="px-4 py-3">
                {o.items.map((i) => (
                  <div key={i.sku} className="flex items-center gap-3 py-2">
                    <div className="relative aspect-square w-10 shrink-0 overflow-hidden bg-cream">
                      <AssetImage src={i.image} alt={i.name} fill className="object-cover object-center" sizes="40px" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="line-clamp-1">{i.name}</p>
                      <p className="text-xs text-ink-soft">Qty: {i.qty}</p>
                    </div>
                    {o.paymentStatus === "PAID" && o.orderStatus === "DELIVERED" && (
                      <div className="shrink-0">{getReviewButton(o, i)}</div>
                    )}
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
      )}

      {modalOrderId && modalProduct && (
        <ReviewModal
          productSku={modalProduct.sku}
          productName={modalProduct.name}
          orderId={modalOrderId}
          existingReview={modalProduct.reviewId ? { id: modalProduct.reviewId, rating: 0, title: "", comment: "", status: "PENDING" } : null}
          onClose={() => {
            setModalOrderId(null);
            setModalProduct(null);
          }}
          onSuccess={() => {
            setModalOrderId(null);
            setModalProduct(null);
            void fetch(`/api/customer/orders/${modalOrderId}/reviews`, { credentials: "include" })
              .then((r) => r.json())
              .then((status: ReviewStatus) => {
                setReviewStatuses((prev) => {
                  const next = new Map(prev);
                  next.set(status.orderId, status);
                  return next;
                });
              })
              .catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
