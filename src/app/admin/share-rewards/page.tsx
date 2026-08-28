"use client";

import { useEffect, useState } from "react";

type ShareReward = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  orderId: string;
  rewardType: string;
  status: string;
  storyProofUrl: string | null;
  postProofUrl: string | null;
  instagramUsername: string;
  taggedAccount: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  couponId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
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
    try {
      const url = new URL("/api/admin/share-rewards", window.location.origin);
      if (filter) url.searchParams.set("status", filter);

      const res = await fetch(url.toString(), { credentials: "include" });
      const data = (await res.json()) as { rewards?: ShareReward[]; error?: string };
      if (res.ok) {
        setRewards(data.rewards || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  async function approve(rewardId: string, action: "approve_5" | "approve_10") {
    setActionLoading(rewardId);
    try {
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
    } catch {
      alert("Something went wrong.");
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(rewardId: string) {
    const reason = rejectReason[rewardId];
    if (!reason) {
      alert("Please enter a rejection reason.");
      return;
    }
    setActionLoading(rewardId);
    try {
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
    } catch {
      alert("Something went wrong.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <h1 className="font-serif text-4xl">Share & Earn Moderation</h1>

      <div className="mt-6 flex items-center gap-4">
        <label className="text-sm">Filter:</label>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
          }}
          className="border border-ink/15 bg-paper px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-6 text-ink-soft">Loading...</p>
      ) : rewards.length === 0 ? (
        <p className="mt-6 text-ink-soft">No submissions found.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {rewards.map((reward) => (
            <div key={reward.id} className="border border-ink/10 bg-paper p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <p className="font-medium">{reward.userName} ({reward.userEmail})</p>
                  <p className="text-sm text-ink-soft">Order: {reward.orderId}</p>
                  <p className="text-sm text-ink-soft">Instagram: @{reward.instagramUsername}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="rounded bg-cream px-2 py-0.5">{reward.rewardType === "STORY_5" ? "5% OFF" : "10% OFF"}</span>
                    <span className={`rounded px-2 py-0.5 ${
                      reward.status === "PENDING" ? "bg-camel/20 text-ink" :
                      reward.status === "APPROVED" ? "bg-green-50 text-green-800" :
                      "bg-red-50 text-red-800"
                    }`}>
                      {reward.status}
                    </span>
                    {reward.orderPaymentStatus && (
                      <span className={`rounded px-2 py-0.5 ${
                        reward.orderPaymentStatus === "PAID" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                      }`}>
                        {reward.orderPaymentStatus}
                      </span>
                    )}
                  </div>
                  {reward.sourceBillAmount > 0 && (
                    <p className="mt-2 text-sm">
                      Paid bill: <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(reward.sourceBillAmount)}</strong>
                    </p>
                  )}
                  {reward.storyProofUrl && (
                    <a href={reward.storyProofUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-camel-dark underline">
                      Story Proof
                    </a>
                  )}
                  {reward.postProofUrl && (
                    <a href={reward.postProofUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-camel-dark underline">
                      Post Proof
                    </a>
                  )}
                  {reward.rejectionReason && (
                    <p className="mt-2 text-xs text-red-800">Reason: {reward.rejectionReason}</p>
                  )}
                  {reward.couponId && (
                    <p className="mt-2 text-xs text-green-800">Coupon generated</p>
                  )}
                </div>
                {reward.status === "PENDING" && (
                  <div className="flex flex-col gap-2 sm:w-48">
                    <button
                      type="button"
                      onClick={() => approve(reward.id, "approve_5")}
                      disabled={actionLoading === reward.id || reward.orderPaymentStatus !== "PAID"}
                      className="h-8 bg-camel px-3 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
                    >
                      Approve 5%
                    </button>
                    <button
                      type="button"
                      onClick={() => approve(reward.id, "approve_10")}
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
                      type="button"
                      onClick={() => reject(reward.id)}
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
