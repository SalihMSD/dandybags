"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cartCount, readCart } from "@/lib/cart";

export function CartFloatingButton() {
  const [count, setCount] = useState(() => cartCount());

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
    <Link
      href="/cart"
      aria-label="Cart"
      className="fixed right-3 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-xl ring-4 ring-paper/80 md:right-6 md:bottom-24"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 8h12l-1 12H7L6 8z" />
        <path d="M9 8V7a3 3 0 016 0v1" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-camel px-1 text-[11px] font-semibold text-ink">
          {count}
        </span>
      )}
    </Link>
  );
}
