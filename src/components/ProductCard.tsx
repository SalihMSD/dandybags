"use client";

import Link from "next/link";
import { AssetImage } from "./AssetImage";
import { useEffect, useState } from "react";
import { addToCart, cartCount, readCart, setQty as setCartQty } from "@/lib/cart";
import { getCategory } from "@/lib/categories";
import { discountPercent, formatInr } from "@/lib/format";
import { type Product } from "@/lib/db/products";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ProductCard({
  product,
  onQuickView,
  priority = false,
}: {
  product: Product;
  onQuickView?: (p: Product) => void;
  priority?: boolean;
}) {
  const cat = getCategory(product.category);
  const off = discountPercent(product.mrp, product.sellingPrice);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qty, setQty] = useState(0);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const sync = () => {
      const cart = readCart();
      const line = cart.find((l) => l.sku === product.sku);
      setQty(line ? line.qty : 0);
    };
    sync();
    window.addEventListener("dandy-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dandy-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, [product.sku]);

  function handleAdd() {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  function handleChange(delta: number) {
    const current = readCart().find((l) => l.sku === product.sku)?.qty ?? 0;
    const next = current + delta;
    if (next <= 0) {
      setCartQty(product.sku, 0);
    } else {
      setCartQty(product.sku, next);
    }
  }

  return (
    <article className="product-card group relative flex h-full flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_8px_24px_-18px_rgba(58,58,57,0.45)] ring-1 ring-ink/8 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-20px_rgba(58,58,57,0.55)]">
      <Link
        href={`/shop/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-t-2xl bg-cream"
      >
        <AssetImage
          src={product.images.master}
          alt={product.name}
          fill
          priority={priority}
          quality={70}
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.08]"
        />
        <span className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-200 group-hover:bg-ink/10" />
        {off != null && (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-0.5 text-[10px] tracking-wider text-paper uppercase">
            {off}% off
          </span>
        )}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onQuickView(product);
            }}
            className="absolute inset-x-4 bottom-4 z-10 hidden rounded-full bg-paper/95 py-2 text-[10px] tracking-[0.16em] uppercase opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 sm:block"
          >
            Quick view
          </button>
        )}
      </Link>
      <button
        type="button"
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-lg shadow-sm ring-1 ring-ink/8 transition-transform duration-200 hover:scale-110"
        onClick={() => {
          if (!isAuthenticated) {
            router.push("/login?next=/account/wishlist");
            return;
          }
          void fetch("/api/customer/wishlist", {
            method: saved ? "DELETE" : "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sku: product.sku }),
          }).then((res) => {
            if (res.ok) setSaved((v) => !v);
          });
        }}
      >
        {saved ? "♥" : "♡"}
      </button>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-[9px] tracking-[0.12em] text-ink-soft uppercase sm:text-[10px] sm:tracking-[0.16em]">
          {cat?.name}
        </p>
        <Link href={`/shop/${product.slug}`} className="mt-1.5">
          <span className="line-clamp-2 min-h-[2.6rem] font-sans text-[15px] leading-snug font-semibold tracking-tight text-ink sm:min-h-[3rem] sm:text-[17px]">
            {product.name}
          </span>
        </Link>
        <div className="mt-auto pt-3">
          <div className="flex min-h-6 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <span className="font-medium">{formatInr(product.sellingPrice)}</span>
            {product.mrp != null && product.sellingPrice != null && product.mrp > product.sellingPrice && (
              <>
                <span className="text-ink-soft line-through">{formatInr(product.mrp)}</span>
                {off != null && (
                  <span className="text-[12px] font-semibold text-camel-dark">{off}% off</span>
                )}
              </>
            )}
          </div>
          {qty > 0 ? (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-ink/5 px-3 py-2">
              <button
                type="button"
                onClick={() => handleChange(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-ink shadow-sm hover:bg-cream"
                aria-label="Decrease quantity"
              >
                <MinusIcon />
              </button>
              <span className="text-sm font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => handleChange(1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-paper shadow-sm hover:bg-ink-soft"
                aria-label="Increase quantity"
              >
                <PlusIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors duration-200 ${
                added ? "bg-camel text-ink" : "bg-ink text-paper hover:bg-ink-soft"
              }`}
            >
              {added ? (
                "Added"
              ) : (
                <>
                  <PlusIcon />
                  Add to cart
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
