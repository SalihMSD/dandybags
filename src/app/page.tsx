import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { categories } from "@/lib/categories";
import { featuredProducts } from "@/lib/products";
import { site } from "@/lib/site";

export default function HomePage() {
  const featured = featuredProducts();

  return (
    <div>
      <section className="relative overflow-hidden bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-ink-soft uppercase">
              {site.tagline}
            </p>
            <h1 className="mt-4 font-serif text-6xl leading-none md:text-8xl">DANDY</h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
              {site.heroSupport}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="bg-camel px-6 py-3.5 text-[12px] tracking-[0.18em] text-ink uppercase"
              >
                Shop bags
              </Link>
              <Link
                href="/categories"
                className="border border-ink px-6 py-3.5 text-[12px] tracking-[0.18em] uppercase"
              >
                Explore collection
              </Link>
              <Link
                href="/wholesale"
                className="px-6 py-3.5 text-[12px] tracking-[0.18em] uppercase underline underline-offset-4"
              >
                Become a business partner
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <AssetImage
              src="/logo-mark.png"
              alt="DANDY emblem"
              fill
              priority
              className="object-contain"
              sizes="400px"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase">Collections</p>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl">Shop by category</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={c} />
          ))}
        </div>
      </section>

      <section className="bg-cream py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="font-serif text-4xl">Featured bags</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Catalogue placeholders — prices and specifications will be published after product
            confirmation.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {featured.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:grid md:grid-cols-2 md:gap-16 md:px-8">
        <div>
          <h2 className="font-serif text-4xl">A bag brand, not a catalogue dump</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            DANDY makes bags for school, college, travel and everyday life. Originally based in
            Erode, the business now operates from Karur, Tamil Nadu — with retail experience,
            manufacturing capability, and a dealer network built over years of trade.
          </p>
          <Link href="/about" className="mt-6 inline-block text-[12px] tracking-[0.16em] uppercase underline">
            About Dandy
          </Link>
        </div>
        <div className="mt-10 border border-ink/10 p-8 md:mt-0">
          <p className="text-[11px] tracking-[0.2em] uppercase">For business</p>
          <h3 className="mt-2 font-serif text-3xl">Partner with DANDY</h3>
          <p className="mt-3 text-sm text-ink-soft">
            Wholesale and supply for retailers, dealers, distributors and bulk buyers.
          </p>
          <Link
            href="/wholesale"
            className="mt-6 inline-block bg-ink px-5 py-3 text-[11px] tracking-[0.16em] text-paper uppercase"
          >
            Business enquiry
          </Link>
        </div>
      </section>
    </div>
  );
}
