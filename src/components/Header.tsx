"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categories } from "@/lib/categories";
import { cartCount } from "@/lib/cart";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { Logo } from "./Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
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

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/95 backdrop-blur-md">
      <p className="bg-ink px-4 py-1.5 text-center text-[11px] tracking-[0.18em] text-paper uppercase">
        Bags for every journey · Karur, Tamil Nadu
      </p>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-8">
        <Logo priority />
        <nav className="ml-6 hidden items-center gap-6 text-[13px] tracking-[0.14em] uppercase lg:flex">
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
              <div className="absolute left-0 top-full w-64 border border-ink/10 bg-paper py-3 shadow-sm">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/categories/${c.slug}`}
                    className="block px-4 py-2 text-[12px] hover:bg-cream"
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
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            aria-label="Search"
            className="p-2"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <SearchIcon />
          </button>
          <Link href="/account" aria-label="Account" className="hidden p-2 sm:block">
            <UserIcon />
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative p-2">
            <BagIcon />
            {count > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-camel px-1 text-[10px] text-ink">
                {count}
              </span>
            )}
          </Link>
          <a
            href={generalWhatsappUrl()}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="hidden p-2 sm:block"
          >
            <WhatsIcon />
          </a>
          <button
            type="button"
            className="p-2 lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>
      {searchOpen && (
        <form action="/shop" className="border-t border-ink/10 px-4 py-3 md:px-8">
          <input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bags"
            className="w-full border border-ink/15 bg-paper px-4 py-2.5 text-sm outline-none focus:border-ink"
            autoFocus
          />
        </form>
      )}
      {open && (
        <div className="border-t border-ink/10 bg-paper px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-3 text-sm tracking-[0.12em] uppercase">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <p className="pt-2 text-[11px] text-ink-soft">Categories</p>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="pl-2"
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
