"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { cartCount, readCart, setQty, type CartLine } from "@/lib/cart";

export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(readCart());
    sync();
    window.addEventListener("dandy-cart", sync);
    return () => window.removeEventListener("dandy-cart", sync);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <h1 className="font-serif text-5xl">Cart</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Checkout and payment will be connected in a later phase. You can still save bags here and
        enquire on WhatsApp.
      </p>
      {lines.length === 0 ? (
        <p className="mt-10 text-sm">
          Your bag is empty.{" "}
          <Link href="/shop" className="underline">
            Shop bags
          </Link>
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-ink/10 border border-ink/10">
          {lines.map((l) => (
            <li key={l.sku} className="flex items-center gap-4 p-4">
              <div className="relative h-20 w-16 bg-cream">
                <AssetImage src={l.image} alt={l.name} fill className="object-cover" sizes="64px" />
              </div>
              <div className="flex-1">
                <Link href={`/shop/${l.slug}`} className="font-serif text-lg">
                  {l.name}
                </Link>
                <p className="text-xs text-ink-soft">{l.sku}</p>
              </div>
              <input
                type="number"
                min={0}
                value={l.qty}
                onChange={(e) => setQty(l.sku, Number(e.target.value))}
                className="w-16 border border-ink/15 px-2 py-1 text-sm"
              />
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 && (
        <p className="mt-6 text-sm text-ink-soft">{cartCount()} item(s). Payment gateway to be added.</p>
      )}
    </div>
  );
}
