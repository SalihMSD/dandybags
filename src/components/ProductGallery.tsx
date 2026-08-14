"use client";

import { useState } from "react";
import { AssetImage } from "./AssetImage";
import { galleryImages, type Product } from "@/lib/products";

export function ProductGallery({ product }: { product: Product }) {
  const images = galleryImages(product);
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="relative aspect-[4/5] border border-ink/10 bg-cream">
        {current && (
          <AssetImage
            src={current.src}
            alt={`${product.name} — ${current.key}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
          />
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.key}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-[4/5] border ${i === active ? "border-ink" : "border-ink/10"}`}
            >
              <AssetImage
                src={img.src}
                alt={img.key}
                fill
                className="object-cover object-center"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">
        Placeholder photography — your product images will replace these after the shoot.
      </p>
    </div>
  );
}
