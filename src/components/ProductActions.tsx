"use client";

import Link from "next/link";
import { addToCart } from "@/lib/cart";
import { productEnquiryUrl } from "@/lib/whatsapp";
import { type Product } from "@/lib/products";

export function ProductActions({ product }: { product: Product }) {
  return (
    <>
      <div className="mt-8 hidden flex-col gap-3 md:flex">
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

      <div className="h-24 md:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="min-h-12 flex-1 bg-camel text-[11px] tracking-[0.14em] text-ink uppercase"
          >
            Add to cart
          </button>
          <a
            href={productEnquiryUrl(product.name, product.sku)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center bg-[#25D366] text-[11px] tracking-[0.14em] text-white uppercase"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
