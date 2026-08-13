"use client";

import Link from "next/link";
import { addToCart } from "@/lib/cart";
import { productEnquiryUrl } from "@/lib/whatsapp";
import { type Product } from "@/lib/products";

export function ProductActions({ product }: { product: Product }) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => addToCart(product)}
        className="bg-camel px-6 py-3.5 text-[12px] tracking-[0.18em] text-ink uppercase hover:bg-camel-dark"
      >
        Add to cart
      </button>
      <Link
        href="/cart"
        onClick={() => addToCart(product)}
        className="border border-ink px-6 py-3.5 text-center text-[12px] tracking-[0.18em] uppercase"
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
  );
}
