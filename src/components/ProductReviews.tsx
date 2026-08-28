"use client";

import { useEffect, useState } from "react";
import { ReviewSummary } from "@/components/ReviewSummary";
import { ReviewForm } from "@/components/ReviewForm";

type Review = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  user: {
    fullName: string;
  };
};

type Props = {
  productSku: string;
};

function StarIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ProductReviews({ productSku }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);

  async function loadReviews() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/reviews?productSku=${encodeURIComponent(productSku)}&sort=${sort}&page=${page}&pageSize=10`);
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviews();
  }, [productSku, sort, page]);

  return (
    <div className="mt-12">
      <ReviewSummary productSku={productSku} />

      <div className="mt-6 flex items-center justify-between">
        <h4 className="font-serif text-lg">Reviews</h4>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="h-10 bg-ink px-5 text-[11px] tracking-[0.16em] uppercase text-paper"
        >
          {showForm ? "Close Form" : "Write a Review"}
        </button>
      </div>

      {showForm && <ReviewForm productSku={productSku} onReviewCreated={() => { setShowForm(false); void loadReviews(); }} />}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-soft">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-ink-soft">No reviews yet. Be the first to review this product.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li key={review.id} className="border border-ink/10 bg-paper p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{review.user.fullName}</p>
                    <div className="mt-1 flex items-center gap-0.5 text-camel-dark">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon key={star} filled={star <= review.rating} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-ink-soft">{new Date(review.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                <p className="mt-2 font-medium">{review.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{review.comment}</p>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  {review.verifiedPurchase && (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-green-800">Verified Purchase</span>
                  )}
                  <span className="text-ink-soft">{review.helpfulCount} found this helpful</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-10 border border-ink px-4 text-[11px] tracking-[0.16em] uppercase disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-ink-soft">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-10 border border-ink px-4 text-[11px] tracking-[0.16em] uppercase disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
