import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopBrowser } from "@/components/ShopBrowser";
import { products } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop bags",
  description: "Shop DANDY school bags, college bags, backpacks, travel bags, slings, handbags and ladies purses.",
};

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-8">
      <p className="text-[11px] tracking-[0.2em] uppercase">Shop</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">All bags</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-soft">
        Sample retail prices are shown until final rates are confirmed. Wholesale pricing stays
        private — request a quote from the business page. Photos are placeholders until you attach
        product images.
      </p>
      <div className="mt-10">
        <Suspense>
          <ShopBrowser products={products} />
        </Suspense>
      </div>
    </div>
  );
}
