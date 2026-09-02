"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ShareReward = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  orderId: string;
  rewardType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  storyProofUrl: string | null;
  postProofUrl: string | null;
  instagramUsername: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  couponId: string | null;
  rejectionReason: string | null;
  sourceBillAmount: number;
  orderPaymentStatus: string | null;
};

export default function AdminShareRewards() {
  const [rewards, setRewards] = useState<ShareReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);

    const res = await fetch(`/api/admin/share-rewards?${params.toString()}`, { credentials: "include" });
    const data = (await res.json()) as { rewards?: ShareReward[]; error?: string };
    if (res.ok) setRewards(data.rewards || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [filter]);

  async function approve(rewardId: string, action: "approve_5" | "approve_10") {
    setActionLoading(rewardId);
    const res = await fetch("/api/admin/share-rewards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rewardId, action }),
    });
    const data = (await res.json()) as { ok?: boolean; couponCode?: string; error?: string };
    if (res.ok && data.ok) {
      alert(`Coupon generated: ${data.couponCode}`);
      await load();
    } else {
      alert(data.error || "Action failed.");
    }
    setActionLoading(null);
  }

  async function reject(rewardId: string) {
    const reason = rejectReason[rewardId];
    if (!reason) {
      alert("Please enter a rejection reason.");
      return;
    }
    setActionLoading(rewardId);
    const res = await fetch("/api/admin/share-rewards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rewardId, action: "reject", reason }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (res.ok && data.ok) {
      await load();
    } else {
      alert(data.error || "Action failed.");
    }
    setActionLoading(null);
  }

  const statusColors = {
    PENDING: "bg-camel/20 text-ink",
    APPROVED: "bg-green-50 text-green-800",
    REJECTED: "bg-red-50 text-red-800",
  };

  const rewardLabel = {
    STORY_5: "5% OFF",
    STORY_AND_POST_10: "10% OFF",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading submissions…</p>
      ) : rewards.length === 0 ? (
        <p className="text-sm text-ink-soft">No submissions found.</p>
      ) : (
        <div className="space-y-4">
          {rewards.map((reward) => (
            <div key={reward.id} className="rounded border border-ink/10 bg-paper p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="font-medium">{reward.userName}</p>
                    <p className="text-sm text-ink-soft">{reward.userEmail}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Link
                      href={`/admin/orders/${reward.orderId}`}
                      className="font-mono text-xs text-camel-dark underline"
                    >
                      Order: {reward.orderId}
                    </Link>
                    <span className="rounded bg-paper border border-ink/10 px-2 py-0.5">
                      {rewardLabel[reward.rewardType as keyof typeof rewardLabel] || reward.rewardType}
                    </span>
                    <span className={`rounded px-2 py-0.5 ${statusColors[reward.status]}`}>
                      {reward.status}
                    </span>
                    {reward.orderPaymentStatus && (
                      <span className={`rounded px-2 py-0.5 ${
                        reward.orderPaymentStatus === "PAID"
                          ? "bg-green-50 text-green-800"
                          : "bg-ink/10 text-ink-soft"
                      }`}>
                        {reward.orderPaymentStatus}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-ink-soft">Instagram: @{reward.instagramUsername}</p>
                  {reward.sourceBillAmount > 0 && (
                    <p className="text-sm">
                      Bill amount: <strong>₹{reward.sourceBillAmount.toLocaleString("en-IN")}</strong>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4">
                    {reward.storyProofUrl && (
                      <a
                        href={reward.storyProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-camel-dark underline"
                      >
                        Story Proof →
                      </a>
                    )}
                    {reward.postProofUrl && (
                      <a
                        href={reward.postProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-camel-dark underline"
                      >
                        Post Proof →
                      </a>
                    )}
                  </div>

                  {reward.rejectionReason && (
                    <p className="text-xs text-red-800">Reason: {reward.rejectionReason}</p>
                  )}
                  {reward.couponId && (
                    <p className="text-xs text-green-800">Coupon generated</p>
                  )}
                  {reward.reviewedAt && (
                    <p className="text-xs text-ink-soft">
                      Reviewed: {new Date(reward.reviewedAt).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>

                {reward.status === "PENDING" && (
                  <div className="flex flex-col gap-2 sm:w-48">
                    <button
                      onClick={() => void approve(reward.id, "approve_5")}
                      disabled={actionLoading === reward.id || reward.orderPaymentStatus !== "PAID"}
                      className="h-8 bg-camel px-3 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
                    >
                      Approve 5%
                    </button>
                    <button
                      onClick={() => void approve(reward.id, "approve_10")}
                      disabled={actionLoading === reward.id || reward.orderPaymentStatus !== "PAID"}
                      className="h-8 border border-ink px-3 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
                    >
                      Approve 10%
                    </button>
                    <textarea
                      value={rejectReason[reward.id] || ""}
                      onChange={(e) => setRejectReason((r) => ({ ...r, [reward.id]: e.target.value }))}
                      placeholder="Rejection reason"
                      className="border border-ink/15 bg-paper px-3 py-2 text-xs"
                    />
                    <button
                      onClick={() => void reject(reward.id)}
                      disabled={actionLoading === reward.id}
                      className="h-8 border border-red-800 px-3 text-[10px] tracking-[0.14em] uppercase text-red-800 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
