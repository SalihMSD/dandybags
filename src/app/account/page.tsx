"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const items = [
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/coupons", label: "My Coupons" },
  { href: "/account/share-rewards", label: "Share & Earn" },
  { href: "/account/wishlist", label: "My Wishlist" },
  { href: "/account/addresses", label: "My Addresses" },
  { href: "/track-order", label: "Track Order" },
  { href: "/account/profile", label: "My Profile" },
  { href: "/account/settings", label: "Account Settings" },
];

export default function AccountPage() {
  const { user, logout, loading } = useAuth();
  if (loading) return <p className="px-4 py-16">Loading...</p>;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <p className="text-[11px] tracking-[0.2em] uppercase">Account</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Welcome, {user.fullName}</h1>
      <div className="mt-10 divide-y divide-ink/10 border border-ink/10">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center justify-between px-5 py-4 hover:bg-cream">
            <span>{item.label}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
        <button type="button" onClick={() => void logout()} className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-cream">
          <span>Logout</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
