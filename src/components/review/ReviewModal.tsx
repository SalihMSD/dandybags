"use client";

import { useEffect, useState } from "react";

type Props = {
  productSku: string;
  productName: string;
  orderId: string;
  existingReview?: {
    id: string;
    rating: number;
    title: string;
    comment: string;
    status: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
};

function StarIcon({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-0.5 transition-colors hover:text-camel-dark"
      aria-label={filled ? "Filled star" : "Empty star"}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  );
}

export function ReviewModal({ productSku, productName, orderId, existingReview, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(existingReview?.title || "");
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    setSubmitting(true);
    try {
      const url = existingReview
        ? `/api/customer/reviews/${existingReview.id}`
        : `/api/customer/orders/${orderId}/reviews`;
      const method = existingReview ? "PATCH" : "POST";

      const body: Record<string, unknown> = { productSku, rating, title, comment };
      if (!existingReview) {
        body.orderId = orderId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to submit review.");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded bg-paper p-6 shadow-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl">{existingReview ? "Edit Review" : "Write a Review"}</h3>
          <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{productName}</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm">Rating</label>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  filled={star <= (hoverRating || rating)}
                  onClick={() => setRating(star)}
                />
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="ml-2 text-xs text-ink-soft underline"
                >
                  Clear
                </button>
              )}
            </div>
            {rating === 0 && <p className="mt-1 text-xs text-red-800">Please select a rating.</p>}
          </div>

          <div>
            <label className="block text-sm">Review Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
              placeholder="Summarize your experience"
              required
            />
          </div>

          <div>
            <label className="block text-sm">Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
              placeholder="Share your thoughts about this product..."
              required
            />
            <p className="mt-1 text-xs text-ink-soft">{comment.length}/2000</p>
          </div>

          {error && <p className="text-sm text-red-800">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
            >
              {submitting ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
