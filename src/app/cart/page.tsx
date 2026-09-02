"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { cartCount, readCart, setQty, type CartLine } from "@/lib/cart";
import { formatInr } from "@/lib/format";

export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(readCart());
    sync();
    window.addEventListener("dandy-cart", sync);
    return () => window.removeEventListener("dandy-cart", sync);
  }, []);

  function updateQty(sku: string, delta: number) {
    const current = lines.find((l) => l.sku === sku);
    const next = current ? current.qty + delta : 1;
    if (next <= 0) {
      setQty(sku, 0);
    } else {
      setQty(sku, next);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
        <h1 className="font-serif text-4xl sm:text-5xl">Cart</h1>
        <div className="mt-8 rounded border border-ink/10 bg-paper p-8 text-center">
          <p className="text-sm text-ink-soft">Your bag is empty.</p>
          <Link href="/shop" className="mt-4 inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase">
            Shop bags
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Cart</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Review your items and proceed to checkout.
      </p>
      <ul className="mt-10 divide-y divide-ink/10 border border-ink/10">
        {lines.map((l) => (
          <li key={l.sku} className="flex items-center gap-4 p-4">
            <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-cream">
              <AssetImage src={l.image} alt={l.name} fill className="object-cover object-center" sizes="64px" />
            </div>
            <div className="flex-1">
              <Link href={`/shop/${l.slug}`} className="font-serif text-lg">
                {l.name}
              </Link>
              <p className="text-xs text-ink-soft">{l.sku}</p>
              <p className="text-xs text-ink-soft">₹{l.sellingPrice} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateQty(l.sku, -1)}
                className="flex h-9 w-9 items-center justify-center border border-ink/15 text-lg leading-none hover:bg-cream"
                aria-label={`Decrease quantity of ${l.name}`}
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{l.qty}</span>
              <button
                type="button"
                onClick={() => updateQty(l.sku, 1)}
                className="flex h-9 w-9 items-center justify-center border border-ink/15 text-lg leading-none hover:bg-cream"
                aria-label={`Increase quantity of ${l.name}`}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/checkout"
          className="inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase"
        >
          Checkout
        </Link>
        <p className="text-sm text-ink-soft">{lines.length} item(s) · Subtotal: {formatInr(lines.reduce((sum, l) => sum + l.sellingPrice * l.qty, 0))}</p>
      </div>
    </div>
  );
}
