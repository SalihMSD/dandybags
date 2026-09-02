"use client";

import { useEffect, useState } from "react";

type AdminReview = {
  id: string;
  productSku: string;
  productName: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: "PENDING" | "APPROVED" | "HIDDEN";
  helpfulCount: number;
  createdAt: string;
};

export default function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const url = new URL("/api/admin/reviews", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", "20");
    if (filter) url.searchParams.set("status", filter);

    const res = await fetch(url.toString(), { credentials: "include" });
    const data = (await res.json()) as { reviews?: AdminReview[]; totalPages?: number; error?: string };
    if (res.ok) {
      setReviews(data.reviews || []);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [filter, page]);

  async function updateStatus(reviewId: string, status: "APPROVED" | "HIDDEN") {
    setActionLoading(reviewId);
    await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reviewId, status }),
    });
    await load();
    setActionLoading(null);
  }

  async function removeReview(reviewId: string) {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    setActionLoading(reviewId);
    await fetch("/api/admin/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reviewId }),
    });
    await load();
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="HIDDEN">Hidden</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink-soft">No reviews found.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded border border-ink/10 bg-paper p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{review.productName}</p>
                    <p className="text-sm text-ink-soft">SKU: {review.productSku}</p>
                    <p className="text-sm text-ink-soft">
                      By {review.userName} ({review.userEmail})
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 text-camel-dark">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= review.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>

                  <p className="font-medium">{review.title}</p>
                  <p className="text-sm text-ink-soft">{review.comment}</p>

                  <div className="flex items-center gap-3 text-xs text-ink-soft">
                    {review.verifiedPurchase && (
                      <span className="rounded bg-green-50 px-2 py-0.5 text-green-800">Verified Purchase</span>
                    )}
                    <span>Helpful: {review.helpfulCount}</span>
                    <span>{new Date(review.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {review.status === "PENDING" && (
                    <button
                      onClick={() => void updateStatus(review.id, "APPROVED")}
                      disabled={actionLoading === review.id}
                      className="h-8 bg-camel px-3 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
                    >
                      Approve
                    </button>
                  )}
                  {review.status !== "HIDDEN" && (
                    <button
                      onClick={() => void updateStatus(review.id, "HIDDEN")}
                      disabled={actionLoading === review.id}
                      className="h-8 border border-ink px-3 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
                    >
                      Hide
                    </button>
                  )}
                  {review.status === "HIDDEN" && (
                    <button
                      onClick={() => void updateStatus(review.id, "APPROVED")}
                      disabled={actionLoading === review.id}
                      className="h-8 bg-camel px-3 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => removeReview(review.id)}
                    disabled={actionLoading === review.id}
                    className="h-8 border border-red-800 px-3 text-[10px] tracking-[0.14em] uppercase text-red-800 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
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
