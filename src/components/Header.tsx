"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { categories } from "@/lib/categories";
import { Logo } from "./Logo";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/track-order", label: "Track Order" },
  { href: "/about", label: "About" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (
    ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/admin/login"].includes(
      pathname,
    )
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper">
      <p className="border-b border-ink/10 bg-cream px-3 py-2 text-center text-[10px] tracking-[0.22em] text-ink-soft uppercase sm:text-[11px]">
        <span className="sm:hidden">Bags for every journey</span>
        <span className="hidden sm:inline">Bags for every journey · Karur, Tamil Nadu</span>
      </p>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:gap-5 sm:px-5 md:px-8 md:py-3.5">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center xl:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <MenuIcon open={open} />
        </button>
        <Logo priority />
        <nav className="ml-auto hidden items-center gap-5 text-[12px] tracking-[0.16em] uppercase xl:flex 2xl:gap-6">
          {links.slice(0, 2).map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-camel-dark">
              {l.label}
            </Link>
          ))}
          <div
            className="relative"
            onMouseEnter={() => setCats(true)}
            onMouseLeave={() => setCats(false)}
          >
            <Link href="/categories" className="hover:text-camel-dark">
              Categories
            </Link>
            {cats && (
              <div className="absolute left-0 top-full z-20 w-64 border border-ink/10 bg-paper py-3 shadow-sm">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/categories/${c.slug}`}
                    className="block px-4 py-2.5 text-[12px] hover:bg-cream"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {links.slice(2).map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-camel-dark">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center xl:ml-2">
          <button
            type="button"
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <SearchIcon />
          </button>
          <Link href="/account/wishlist" aria-label="Wishlist" className="flex h-11 w-11 items-center justify-center">
            <WishlistIcon />
          </Link>
          <AccountMenu />
        </div>
      </div>
      {searchOpen && (
        <form action="/shop" className="border-t border-ink/10 px-3 py-3 sm:px-4 md:px-8">
          <input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bags"
            className="h-11 w-full border border-ink/15 bg-paper px-4 text-base outline-none focus:border-ink md:text-sm"
            autoFocus
          />
        </form>
      )}
      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-paper shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-ink/10 px-4 py-4">
                <span className="font-serif text-xl">Menu</span>
                <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center" aria-label="Close menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-4 py-3">
                <div className="flex flex-col text-sm tracking-[0.12em] uppercase">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex min-h-12 items-center border-b border-ink/5"
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </nav>
              <div className="border-t border-ink/10 px-4 py-4 text-xs text-ink-soft">
                © DANDY 2026
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function AccountMenu() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <span className="flex h-11 w-11 items-center justify-center" />;
  }

  if (!user) {
    return (
      <Link href="/login" aria-label="Account" className="flex h-11 w-11 items-center justify-center">
        <UserIcon />
      </Link>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-11 w-11 items-center justify-center" aria-label="Account">
        <UserIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 w-52 border border-ink/10 bg-paper py-2 text-sm shadow-sm">
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="flex items-center gap-3 px-4 py-2 hover:bg-cream" onClick={() => setOpen(false)}>
              <ShieldIcon /> Admin
            </Link>
          ) : (
            <>
              <Link href="/account" className="flex items-center gap-3 px-4 py-2 hover:bg-cream" onClick={() => setOpen(false)}>
                <ProfileIcon /> Profile
              </Link>
              <Link href="/account/orders" className="flex items-center gap-3 px-4 py-2 hover:bg-cream" onClick={() => setOpen(false)}>
                <OrdersIcon /> My Orders
              </Link>
              <Link href="/account/coupons" className="flex items-center gap-3 px-4 py-2 hover:bg-cream" onClick={() => setOpen(false)}>
                <CouponIcon /> My Coupons
              </Link>
              <Link href="/account/share-rewards" className="flex items-center gap-3 px-4 py-2 hover:bg-cream" onClick={() => setOpen(false)}>
                <ShareIcon /> Share & Earn
              </Link>
              <Link href="/account/addresses" className="flex items-center gap-3 px-4 py-2 hover:bg-cream" onClick={() => setOpen(false)}>
                <AddressIcon /> Addresses
              </Link>
            </>
          )}
          <div className="my-1 border-t border-ink/10" />
          <Link href="/" className="flex items-center gap-3 px-4 py-2 hover:bg-cream" onClick={() => setOpen(false)}>
            <HomeIcon /> Back to Home
          </Link>
          <button type="button" onClick={() => { setOpen(false); void logout(); }} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-cream">
            <LogoutIcon /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" />
    </svg>
  );
}
function WishlistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function AddressIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function CouponIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}
