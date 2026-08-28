"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Coupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minimumOrderValue: number | null;
  maximumDiscount: number | null;
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  userId: string | null;
  status: string;
  usedAt: string | null;
  sourceOrderId: string | null;
  sourceBillAmount: number | null;
  rewardPercentage: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function MyCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apply = params.get("apply");
    if (apply) setPrefill(apply);
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/customer/coupons", { credentials: "include" });
      const data = (await res.json()) as { coupons?: Coupon[]; error?: string };
      if (res.ok) setCoupons(data.coupons || []);
      setLoading(false);
    }
    void load();
  }, []);

  function applyAtCheckout(code: string) {
    router.push(`/checkout?coupon=${encodeURIComponent(code)}`);
  }

  const available = coupons.filter((c) => c.status === "ACTIVE");
  const used = coupons.filter((c) => c.status === "USED");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase">Account</p>
          <h1 className="mt-2 font-serif text-4xl">My Coupons</h1>
        </div>
        <Link href="/account" className="text-xs underline">
          Back to Account
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-ink-soft">Loading...</p>
      ) : coupons.length === 0 ? (
        <p className="mt-6 text-ink-soft">No coupons yet. Share & Earn rewards will appear here after admin approval.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {available.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl">Available</h2>
              <div className="mt-4 space-y-4">
                {available.map((coupon) => (
                  <div key={coupon.id} className="rounded border border-ink/10 bg-paper p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-medium">🎁 {coupon.code}</p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {coupon.discountType === "FIXED"
                            ? `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(coupon.discountValue)} OFF`
                            : `${coupon.discountValue}% OFF`}
                        </p>
                        {coupon.sourceBillAmount != null && (
                          <p className="mt-1 text-xs text-ink-soft">
                            Generated from: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(coupon.sourceBillAmount)} purchase
                          </p>
                        )}
                        {coupon.rewardPercentage != null && (
                          <p className="text-xs text-ink-soft">Reward: {coupon.rewardPercentage}% Share & Earn</p>
                        )}
                        <p className="mt-1 text-xs text-ink-soft">
                          Expires: {new Date(coupon.validUntil).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAtCheckout(coupon.code)}
                        className="h-10 bg-camel px-5 text-[11px] tracking-[0.16em] uppercase"
                      >
                        Apply at Checkout
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {used.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl">Used</h2>
              <div className="mt-4 space-y-4">
                {used.map((coupon) => (
                  <div key={coupon.id} className="rounded border border-ink/10 bg-cream p-5 opacity-70">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-medium">🎁 {coupon.code}</p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {coupon.discountType === "FIXED"
                            ? `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(coupon.discountValue)} OFF`
                            : `${coupon.discountValue}% OFF`}
                        </p>
                        <p className="mt-1 text-xs text-ink-soft">
                          Used on: {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString("en-IN") : "—"}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-widest text-ink-soft">Used</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
