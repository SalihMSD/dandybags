"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { categories } from "@/lib/categories";
import { cartCount } from "@/lib/cart";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { Logo } from "./Logo";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState(false);
  const [count, setCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const sync = () => setCount(cartCount());
    sync();
    window.addEventListener("dandy-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dandy-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
          <AccountMenu />
          <Link href="/cart" aria-label="Cart" className="relative flex h-11 w-11 items-center justify-center">
            <BagIcon />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-camel px-1 text-[10px] text-ink">
                {count}
              </span>
            )}
          </Link>
          <a
            href={generalWhatsappUrl()}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="hidden h-11 w-11 items-center justify-center sm:flex"
          >
            <WhatsIcon />
          </a>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center xl:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
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
        <div className="max-h-[min(80vh,32rem)] overflow-y-auto border-t border-ink/10 bg-paper px-4 py-3 xl:hidden">
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
            <Link href="/account" className="flex min-h-12 items-center border-b border-ink/5" onClick={() => setOpen(false)}>
              Account
            </Link>
            <p className="pt-4 pb-1 text-[11px] text-ink-soft">Categories</p>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="flex min-h-12 items-center border-b border-ink/5 pl-1"
                onClick={() => setOpen(false)}
              >
                {c.name}
              </Link>
            ))}
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
    return <span className="hidden h-11 w-11 sm:block" />;
  }

  if (!user) {
    return (
      <Link href="/login" aria-label="Account" className="hidden h-11 w-11 items-center justify-center sm:flex">
        <UserIcon />
      </Link>
    );
  }

  const first = user.fullName.split(" ")[0];

  return (
    <div className="relative hidden sm:block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="flex h-11 max-w-[9rem] items-center px-2 text-[12px] tracking-[0.08em]">
        Hi, {first}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 w-52 border border-ink/10 bg-paper py-2 text-sm shadow-sm">
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="block px-4 py-2 hover:bg-cream">
              Admin
            </Link>
          ) : (
            <>
              <Link href="/account" className="block px-4 py-2 hover:bg-cream">
                My Account
              </Link>
              <Link href="/account/orders" className="block px-4 py-2 hover:bg-cream">
                My Orders
              </Link>
              <Link href="/account/wishlist" className="block px-4 py-2 hover:bg-cream">
                Wishlist
              </Link>
              <Link href="/account/addresses" className="block px-4 py-2 hover:bg-cream">
                Addresses
              </Link>
            </>
          )}
          <button type="button" onClick={() => void logout()} className="block w-full px-4 py-2 text-left hover:bg-cream">
            Logout
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
function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V7a3 3 0 016 0v1" />
    </svg>
  );
}
function WhatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.96.52 3.86 1.5 5.54L2 22l4.78-1.55a10.07 10.07 0 005.26 1.45h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2zm5.76 13.98c-.24.68-1.4 1.3-1.94 1.34-.5.04-1.12.06-1.81-.11-.42-.11-.95-.31-1.64-.61-2.89-1.25-4.77-4.16-4.92-4.35-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.77-.36h.56c.18 0 .42-.07.65.5.24.58.81 2 .88 2.14.07.14.12.31.02.5-.1.2-.15.31-.29.48-.14.16-.3.37-.43.5-.14.14-.29.29-.12.56.16.27.73 1.2 1.56 1.95 1.07.96 1.97 1.26 2.24 1.4.27.14.43.12.59-.07.16-.2.68-.79.86-1.06.18-.27.36-.22.61-.13.24.08 1.55.73 1.82.86.27.14.45.2.51.31.07.12.07.68-.17 1.36z" />
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
