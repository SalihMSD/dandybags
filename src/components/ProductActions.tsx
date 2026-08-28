"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addToCart, cartCount, readCart } from "@/lib/cart";
import { productEnquiryUrl } from "@/lib/whatsapp";
import { type Product } from "@/lib/db/products";

export function ProductActions({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1200);
    return () => clearTimeout(t);
  }, [added]);

  function handleAdd() {
    addToCart(product);
    setAdded(true);
  }

  return (
    <>
      <div className="mt-8 hidden flex-col gap-3 md:flex">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center bg-camel px-6 py-3.5 text-[12px] tracking-[0.18em] text-ink uppercase hover:bg-camel-dark"
        >
          Add to cart
        </button>
        <Link
          href="/cart"
          onClick={handleAdd}
          className="inline-flex items-center justify-center border border-ink px-6 py-3.5 text-center text-[12px] tracking-[0.18em] uppercase"
        >
          Buy now
        </Link>
        <a
          href={productEnquiryUrl(product.name, product.sku)}
          target="_blank"
          rel="noreferrer"
          className="text-center text-[12px] tracking-[0.14em] uppercase underline underline-offset-4"
        >
          WhatsApp enquiry
        </a>
        <Link
          href="/wholesale#enquiry"
          className="text-center text-[12px] tracking-[0.14em] text-ink-soft uppercase"
        >
          Request bulk quote
        </Link>
      </div>

      <div className="h-24 md:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="relative min-h-12 flex-1 bg-camel text-[11px] tracking-[0.14em] text-ink uppercase"
          >
            {added ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Added
              </span>
            ) : (
              "Add to cart"
            )}
          </button>
          <Link
            href="/cart"
            className="flex min-h-12 w-11 items-center justify-center border border-ink/10"
            aria-label="Cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 8h12l-1 12H7L6 8z" />
              <path d="M9 8V7a3 3 0 016 0v1" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}
