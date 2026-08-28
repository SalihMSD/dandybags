"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Order = {
  id: string;
  createdAt: string;
  items: { name: string; qty: number; image: string }[];
  totalLabel: string;
  paymentStatus: string;
  orderStatus: string;
};

type ShareReward = {
  id: string;
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
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
};

function RewardModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    orderId,
    rewardType: "STORY_5",
    instagramUsername: "",
    storyProofUrl: "",
    postProofUrl: "",
  });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function submitReward(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/share-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        alert(data.error || "Submission failed.");
        return;
      }
      alert("Submitted for verification!");
      onClose();
    } catch {
      alert("Something went wrong.");
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
          <h3 className="font-serif text-xl">Submit Proof</h3>
          <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
            ✕
          </button>
        </div>
        <form onSubmit={submitReward} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm">Instagram Username</label>
            <input
              type="text"
              value={formData.instagramUsername}
              onChange={(e) => setFormData((f) => ({ ...f, instagramUsername: e.target.value.trim() }))}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
              placeholder="@username"
              required
            />
          </div>
          <div>
            <label className="block text-sm">Reward Type</label>
            <select
              value={formData.rewardType}
              onChange={(e) => setFormData((f) => ({ ...f, rewardType: e.target.value }))}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
            >
              <option value="STORY_5">Story only (5% OFF)</option>
              <option value="STORY_AND_POST_10">Story + Post (10% OFF)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">Story Proof URL</label>
            <input
              type="url"
              value={formData.storyProofUrl}
              onChange={(e) => setFormData((f) => ({ ...f, storyProofUrl: e.target.value.trim() }))}
              className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
              placeholder="https://..."
              required
            />
          </div>
          {formData.rewardType === "STORY_AND_POST_10" && (
            <div>
              <label className="block text-sm">Post Proof URL</label>
              <input
                type="url"
                value={formData.postProofUrl}
                onChange={(e) => setFormData((f) => ({ ...f, postProofUrl: e.target.value.trim() }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="https://..."
                required
              />
            </div>
          )}
          <p className="text-xs text-ink-soft">
            Make sure you have tagged <strong>@dandybagsonline.in</strong> in your Story/Post.
          </p>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit for Verification"}
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

export default function ShareEarnPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rewards, setRewards] = useState<ShareReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOrderId, setModalOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [ordersRes, rewardsRes] = await Promise.all([
        fetch("/api/customer/orders", { credentials: "include" }),
        fetch("/api/customer/share-rewards", { credentials: "include" }),
      ]);
      const ordersData = (await ordersRes.json()) as { orders: Order[] };
      const rewardsData = (await rewardsRes.json()) as { rewards: ShareReward[] };
      setOrders(ordersData.orders || []);
      setRewards(rewardsData.rewards || []);
      setLoading(false);
    }
    void load();
  }, []);

  const eligibleOrders = orders.filter((o) => o.paymentStatus === "PAID");
  const rewardByOrder = new Map(rewards.map((r) => [r.orderId, r]));

  function openRewardForm(orderId: string) {
    setModalOrderId(orderId);
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">Share & Earn</h1>
      <p className="mt-4 max-w-xl text-sm text-ink-soft">
        Share your Dandy Bags purchase on Instagram and earn coupons for your next order.
        Tag <strong>@dandybagsonline.in</strong> in your Story and/or Post.
      </p>

      <div className="mt-8 rounded border border-ink/10 bg-paper p-6">
        <h2 className="font-serif text-xl">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-ink/10 bg-cream p-4">
            <p className="text-sm font-medium">5% OFF</p>
            <p className="mt-1 text-xs text-ink-soft">
              Post an Instagram Story for 24 hours tagging @dandybagsonline.in
            </p>
          </div>
          <div className="rounded border border-ink/10 bg-cream p-4">
            <p className="text-sm font-medium">10% OFF</p>
            <p className="mt-1 text-xs text-ink-soft">
              Post an Instagram Story + Feed Post, both tagging @dandybagsonline.in
            </p>
          </div>
        </div>
      </div>

      <h2 className="mt-10 font-serif text-2xl">Your Orders</h2>
      {eligibleOrders.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No eligible orders yet. Complete a purchase to qualify.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {eligibleOrders.map((o) => {
            const reward = rewardByOrder.get(o.id);
            return (
              <li key={o.id} className="border border-ink/10 bg-paper p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-lg">{o.id}</p>
                    <p className="text-xs text-ink-soft">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-sm font-medium">{o.totalLabel}</span>
                    {reward ? (
                      <div className="rounded border border-ink/10 bg-cream px-3 py-2 text-xs">
                        <span className="font-medium">{reward.status}</span>
                        {reward.status === "APPROVED" && reward.couponCode && (
                          <span className="ml-2 text-green-800">{reward.couponCode}</span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openRewardForm(o.id)}
                        className="h-10 bg-camel px-5 text-[11px] tracking-[0.16em] uppercase"
                      >
                        Share & Earn
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalOrderId && <RewardModal key={modalOrderId} orderId={modalOrderId} onClose={() => setModalOrderId(null)} />}
    </div>
  );
}
