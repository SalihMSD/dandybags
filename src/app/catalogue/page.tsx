import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { categories } from "@/lib/categories";
import { products } from "@/lib/products";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Download the DANDY bag catalogue for dealers, distributors and organized retail buyers.",
};

export default function CataloguePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">Catalogue</h1>
          <p className="mt-3 max-w-xl text-sm text-ink-soft">
            Suitable for dealers, distributors and organized retail discussions. Wholesale prices
            are not printed here.
          </p>
        </div>
        <PrintButton />
      </div>

      <section className="mt-12 border border-ink/10 bg-cream p-8 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-4 text-[11px] tracking-[0.28em] uppercase">{site.tagline}</p>
      </section>

      <p className="mt-8 text-sm leading-relaxed text-ink-soft">
        DANDY is a bag brand operating from Karur, Tamil Nadu (originally Erode). Categories:
        school, college, backpacks, travel, sling, handbags and ladies purses.
      </p>

      {categories.map((c) => {
        const items = products.filter((p) => p.category === c.slug);
        return (
          <section key={c.slug} className="mt-12">
            <h2 className="font-serif text-3xl">{c.name}</h2>
            <div className="mt-4 divide-y divide-ink/10 border border-ink/10">
              {items.map((p) => (
                <Link
                  key={p.sku}
                  href={`/shop/${p.slug}`}
                  className="grid grid-cols-[80px_1fr] gap-4 p-4 hover:bg-cream sm:grid-cols-[96px_1fr_1fr]"
                >
                  <div className="relative aspect-[4/5] w-20 overflow-hidden bg-cream sm:w-24">
                    <AssetImage src={p.images.front} alt={p.name} fill className="object-cover object-center" sizes="96px" />
                  </div>
                  <div>
                    <p className="font-serif text-lg">{p.name}</p>
                    <p className="text-xs text-ink-soft">SKU {p.sku}</p>
                    <p className="mt-1 text-xs">Colour: {p.colour}</p>
                  </div>
                  <div className="hidden text-xs text-ink-soft sm:block">
                    <p>Dimensions: {p.length} × {p.width} × {p.height}</p>
                    <p>Weight: {p.weight}</p>
                    <p>Material: {p.material}</p>
                    <p>Features: {p.features.join(", ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
