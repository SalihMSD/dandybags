"use client";

import Link from "next/link";
import { AssetImage } from "./AssetImage";
import { useState } from "react";
import { addToCart } from "@/lib/cart";
import { getCategory } from "@/lib/categories";
import { discountPercent, formatInr } from "@/lib/format";
import { type Product } from "@/lib/products";

export function ProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView?: (p: Product) => void;
}) {
  const cat = getCategory(product.category);
  const off = discountPercent(product.mrp, product.sellingPrice);
  const [added, setAdded] = useState(false);

  return (
    <article className="group border border-ink/10 bg-paper">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-cream">
        <AssetImage
          src={product.images.front}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {off != null && (
          <span className="absolute left-3 top-3 bg-ink px-2 py-0.5 text-[10px] tracking-wider text-paper uppercase">
            {off}% off
          </span>
        )}
      </Link>
      <div className="p-3 md:p-4">
        <p className="text-[10px] tracking-[0.16em] text-ink-soft uppercase">{cat?.name}</p>
        <Link href={`/shop/${product.slug}`} className="mt-1 block font-serif text-lg leading-snug">
          {product.name}
        </Link>
        <div className="mt-2 flex items-baseline gap-2 text-sm">
          <span>{formatInr(product.sellingPrice)}</span>
          {product.mrp != null && product.sellingPrice != null && (
            <span className="text-ink-soft line-through">{formatInr(product.mrp)}</span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="flex-1 border border-ink/20 py-2 text-[10px] tracking-[0.14em] uppercase hover:border-ink"
            >
              Quick view
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              addToCart(product);
              setAdded(true);
              setTimeout(() => setAdded(false), 1200);
            }}
            className="flex-1 bg-ink py-2 text-[10px] tracking-[0.14em] text-paper uppercase hover:bg-ink-soft"
          >
            {added ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
