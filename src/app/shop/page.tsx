import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopBrowser } from "@/components/ShopBrowser";
import { listPublicProducts } from "@/lib/db/products";

export const metadata: Metadata = {
  title: "Shop bags",
  description: "Shop DANDY school bags, college bags, backpacks, travel bags, slings, handbags and ladies purses.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const { products } = await listPublicProducts({ pageSize: 100, sort: "newest" });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-8">
      <p className="text-[11px] tracking-[0.2em] uppercase">Shop</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">All bags</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-soft">
        Explore our complete collection of bags for school, college, travel, work and everyday life.
      </p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-sm text-ink-soft">Loading products...</p>}>
          <ShopBrowser products={products} />
        </Suspense>
      </div>
    </div>
  );
}
