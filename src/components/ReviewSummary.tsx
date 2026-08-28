"use client";

import { useEffect, useState } from "react";

type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

type Props = {
  productSku: string;
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ReviewSummary({ productSku }: Props) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/customer/reviews/summary?productSku=${encodeURIComponent(productSku)}`)
      .then((r) => r.json())
      .then((data: ReviewSummary) => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [productSku]);

  if (loading) {
    return <div className="mt-6 text-sm text-ink-soft">Loading reviews...</div>;
  }

  if (!summary || summary.totalReviews === 0) {
    return null;
  }

  const maxCount = Math.max(...Object.values(summary.breakdown), 1);

  return (
    <div className="mt-8 border border-ink/10 bg-paper p-6">
      <h3 className="font-serif text-xl">Customer Reviews</h3>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        <div className="text-center">
          <p className="font-serif text-5xl">{summary.averageRating.toFixed(1)}</p>
          <div className="mt-2 flex items-center justify-center gap-0.5 text-camel-dark">
            {[5, 4, 3, 2, 1].map((star) => (
              <StarIcon key={star} filled={star <= Math.round(summary.averageRating)} />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">{summary.totalReviews} review{summary.totalReviews !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.breakdown[star as 1 | 2 | 3 | 4 | 5] || 0;
            const width = (count / maxCount) * 100;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right">{star}</span>
                <StarIcon filled />
                <div className="flex-1 h-2 bg-cream">
                  <div className="h-full bg-camel-dark" style={{ width: `${width}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-ink-soft">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
