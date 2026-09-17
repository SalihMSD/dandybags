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
  returnStatus: string | null;
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

type ReturnRequest = {
  id: string;
  status: string;
  resolution: string;
  reason: string;
  note: string | null;
  items: { sku: string; qty: number; condition: string | null; reason: string | null }[];
  refundAmount: number | null;
  exchangeVariantSku: string | null;
  adminNote: string | null;
  processedAt: string | null;
  refund: {
    id: string;
    status: string;
    amount: number;
    razorpayRefundId: string | null;
    failureReason: string | null;
  } | null;
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

const returnStatusColor: Record<string, string> = {
  REQUESTED: "bg-ink/10 text-ink",
  APPROVED: "bg-amber-50 text-amber-800",
  REJECTED: "bg-red-50 text-red-800",
  COMPLETED: "bg-green-50 text-green-800",
  CANCELLED: "bg-ink/10 text-ink-soft",
};

const RETURN_REASONS = [
  { value: "DEFECTIVE", label: "Defective or damaged" },
  { value: "WRONG_ITEM", label: "Wrong item received" },
  { value: "SIZE_ISSUE", label: "Size or fit issue" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "CHANGED_MY_MIND", label: "Changed my mind" },
  { value: "OTHER", label: "Other" },
] as const;

const RETURNABLE_STATUSES = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

const STATUS_STEPS = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;

type ReturnForm = {
  resolution: "REFUND" | "REPLACE" | "EXCHANGE";
  reason: string;
  note: string;
  exchangeVariantSku: string;
  itemSelection: Record<string, number>;
};

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [modalProduct, setModalProduct] = useState<{ sku: string; name: string; reviewId?: string | null } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [existingReturn, setExistingReturn] = useState<ReturnRequest | null>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnForm, setReturnForm] = useState<ReturnForm>({
    resolution: "REFUND",
    reason: "",
    note: "",
    exchangeVariantSku: "",
    itemSelection: {},
  });
  const [returnSubmitting, setReturningSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [returnSuccess, setReturnSuccess] = useState(false);

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

    void fetch(`/api/customer/orders/${params.orderId}/returns`, { credentials: "include" }).then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as { returnRequest?: ReturnRequest | null };
        setExistingReturn(data.returnRequest || null);
      }
    }).catch(() => undefined);
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

  async function handleCancel() {
    if (!order) return;
    setCancelPending(true);
    setCancelError("");

    try {
      const res = await fetch(`/api/customer/orders/${order.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Unable to cancel this order right now.");
      }

      setOrder((prev) => (prev ? { ...prev, orderStatus: "CANCELLED" } : null));
      setShowCancelConfirm(false);
      setCancelSuccess(true);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Unable to cancel this order right now.");
    } finally {
      setCancelPending(false);
    }
  }

  const canRequestReturn = (() => {
    if (!order) return false;
    if (order.paymentStatus !== "PAID") return false;
    if (!RETURNABLE_STATUSES.includes(order.orderStatus)) return false;
    if (existingReturn && ["REQUESTED", "APPROVED"].includes(existingReturn.status)) return false;
    return true;
  })();

  async function submitReturnRequest() {
    if (!order) return;
    setReturningSubmitting(true);
    setReturnError("");
    setReturnSuccess(false);

    const items = Object.entries(returnForm.itemSelection)
      .filter(([, qty]) => qty > 0)
      .map(([sku, qty]) => ({ sku, qty }));

    if (items.length === 0) {
      setReturnError("Please select at least one item to return.");
      setReturningSubmitting(false);
      return;
    }

    const payload: Record<string, unknown> = {
      resolution: returnForm.resolution,
      reason: returnForm.reason,
      note: returnForm.note,
      items: items,
    };

    if (returnForm.resolution === "EXCHANGE" || returnForm.resolution === "REPLACE") {
      payload.exchangeVariantSku = returnForm.exchangeVariantSku;
    }

    try {
      const res = await fetch(`/api/customer/orders/${order.id}/returns`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Unable to submit return request.");
      }

      const data = await res.json();
      setExistingReturn(data.returnRequest);
      setShowReturnForm(false);
      setReturnSuccess(true);
      setOrder((prev) => (prev ? { ...prev, returnStatus: "REQUESTED" } : null));
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Unable to submit return request.");
    } finally {
      setReturningSubmitting(false);
    }
  }

  function resetReturnForm() {
    setReturnForm({
      resolution: "REFUND",
      reason: "",
      note: "",
      exchangeVariantSku: "",
      itemSelection: {},
    });
    setShowReturnForm(false);
    setReturnError("");
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

      {existingReturn && (
        <div className="mt-8 rounded border border-ink/10 bg-paper p-6">
          <h2 className="font-serif text-xl">Return Request</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Status</span>
              <span className={`rounded px-2 py-0.5 text-xs ${returnStatusColor[existingReturn.status] || "bg-cream text-ink-soft"}`}>
                {existingReturn.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Resolution</span>
              <span>{existingReturn.resolution}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Reason</span>
              <span>{existingReturn.reason}</span>
            </div>
            {existingReturn.refund && (
              <div className="flex justify-between">
                <span className="text-ink-soft">Refund</span>
                <span>{existingReturn.refund.status} {existingReturn.refund.razorpayRefundId}</span>
              </div>
            )}
            {existingReturn.adminNote && (
              <div>
                <span className="text-ink-soft">Admin Note</span>
                <p className="mt-1">{existingReturn.adminNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

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

      {order.orderStatus === "PLACED" && order.paymentStatus !== "PAID" && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              setShowCancelConfirm(true);
              setCancelError("");
            }}
            disabled={cancelPending}
            className="inline-flex h-12 items-center justify-center border border-red-800 px-6 text-[11px] tracking-[0.12em] uppercase text-red-800 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel Order
          </button>
          {cancelSuccess && (
            <p className="mt-3 text-sm text-green-800">Your order has been cancelled.</p>
          )}
        </div>
      )}

      {canRequestReturn && (
        <div className="mt-8 rounded border border-ink/10 bg-paper p-6">
          <h2 className="font-serif text-xl">Request a Return</h2>
          <p className="mt-3 text-sm text-ink-soft">
            You can request a return, replacement, or exchange for this order. Select the items you wish to return below.
          </p>

          {!showReturnForm && (
            <button
              type="button"
              onClick={() => setShowReturnForm(true)}
              className="mt-4 h-10 bg-camel px-6 text-[11px] tracking-[0.16em] uppercase"
            >
              Request Return
            </button>
          )}

          {showReturnForm && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm uppercase">Resolution</label>
                <div className="mt-2 flex gap-4">
                  {(["REFUND", "REPLACE", "EXCHANGE"] as const).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="resolution"
                        value={opt}
                        checked={returnForm.resolution === opt}
                        onChange={(e) => setReturnForm({ ...returnForm, resolution: e.target.value as typeof returnForm.resolution })}
                        className="h-4 w-4"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {(returnForm.resolution === "EXCHANGE" || returnForm.resolution === "REPLACE") && (
                  <label className="mt-3 block text-sm">
                    Exchange Variant SKU
                    <input
                      type="text"
                      value={returnForm.exchangeVariantSku}
                      onChange={(e) => setReturnForm({ ...returnForm, exchangeVariantSku: e.target.value })}
                      className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm"
                      placeholder="e.g. SKU-001-BLK"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm uppercase">Items to Return</label>
                <div className="mt-2 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.sku} className="flex items-center justify-between">
                      <span className="text-sm">{item.name} (SKU: {item.sku})</span>
                      <input
                        type="number"
                        min={0}
                        max={item.qty}
                        value={returnForm.itemSelection[item.sku] ?? ""}
                        onChange={(e) => {
                          const qty = Math.max(0, Math.min(item.qty, Number(e.target.value) || 0));
                          setReturnForm({
                            ...returnForm,
                            itemSelection: { ...returnForm.itemSelection, [item.sku]: qty },
                          });
                        }}
                        className="w-20 border border-ink/10 bg-paper px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm uppercase">Reason</label>
                <select
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  className="mt-1 w-full border border-ink/10 bg-paper px-3 py-2 text-sm"
                >
                  <option value="">Select a reason</option>
                  {RETURN_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {returnForm.reason === "OTHER" && (
                  <input
                    type="text"
                    placeholder="Please describe..."
                    value={returnForm.note}
                    onChange={(e) => setReturnForm({ ...returnForm, note: e.target.value })}
                    className="mt-2 w-full border border-ink/10 bg-paper px-3 py-2 text-sm"
                  />
                )}
              </div>

              {returnError && <p className="text-sm text-red-800">{returnError}</p>}
              {returnSuccess && <p className="text-sm text-green-800">Return request submitted successfully.</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetReturnForm}
                  disabled={returnSubmitting}
                  className="h-10 border border-ink/15 px-6 text-[11px] tracking-[0.16em] uppercase hover:bg-cream disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitReturnRequest()}
                  disabled={returnSubmitting || !returnForm.reason}
                  className="h-10 bg-camel px-6 text-[11px] tracking-[0.16em] uppercase disabled:opacity-60"
                >
                  {returnSubmitting ? "Submitting…" : "Submit Return Request"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded border border-ink/10 bg-paper p-6 shadow-lg">
            <h3 className="font-serif text-xl">Cancel this order?</h3>
            <p className="mt-3 text-sm text-ink-soft">
              This action cannot be undone. Once cancelled, this order cannot be recovered.
            </p>
            {cancelError && (
              <p className="mt-3 text-sm text-red-800">{cancelError}</p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelError("");
                }}
                disabled={cancelPending}
                className="inline-flex h-12 items-center justify-center border border-ink/15 px-6 text-[12px] tracking-[0.12em] uppercase hover:bg-cream disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelPending}
                className="inline-flex h-12 items-center justify-center border border-red-800 bg-red-800 px-6 text-[12px] tracking-[0.12em] uppercase text-paper hover:bg-red-900 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelPending ? "Cancelling..." : "Yes, Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
