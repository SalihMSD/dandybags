"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const items = [
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/wishlist", label: "My Wishlist" },
  { href: "/account/addresses", label: "My Addresses" },
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
          <Link key={item.href} href={item.href} className="block px-5 py-4 hover:bg-cream">
            {item.label}
          </Link>
        ))}
        <button type="button" onClick={() => void logout()} className="block w-full px-5 py-4 text-left hover:bg-cream">
          Logout
        </button>
      </div>
    </div>
  );
}
