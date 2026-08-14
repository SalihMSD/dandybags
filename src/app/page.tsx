import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductRail } from "@/components/ProductRail";
import { categories } from "@/lib/categories";
import { featuredProducts, products } from "@/lib/products";
import { site } from "@/lib/site";

const journeys = [
  { title: "School", line: "Made for the everyday route to class.", href: "/categories/school-bags" },
  { title: "Campus", line: "For college days and the commute between them.", href: "/categories/college-bags" },
  { title: "Travel", line: "Packed for weekends and longer roads.", href: "/categories/travel-bags" },
];

export default function HomePage() {
  const featured = featuredProducts();
  const arrivals = products.slice(0, 8);
  const marquee = [...categories, ...categories].map((c) => c.name);

  return (
    <div>
      <section className="relative overflow-hidden bg-cream">
        <div className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:gap-12 md:px-8 md:py-16">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.32em] text-ink-soft uppercase">{site.tagline}</p>
            <h1 className="mt-6 font-serif text-[clamp(3.2rem,11vw,7.5rem)] leading-[0.88] tracking-tight text-ink">
              Bags for
              <br />
              <span className="italic">every journey</span>
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-soft md:text-lg">
              {site.heroSupport}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/shop"
                className="bg-camel px-8 py-4 text-center text-[12px] tracking-[0.22em] text-ink uppercase"
              >
                Shop now
              </Link>
              <Link
                href="/categories"
                className="border border-ink px-8 py-4 text-center text-[12px] tracking-[0.22em] uppercase hover:bg-ink hover:text-paper"
              >
                Explore collection
              </Link>
            </div>
            <Link
              href="/wholesale"
              className="mt-6 inline-block text-[11px] tracking-[0.2em] uppercase underline underline-offset-8"
            >
              Become a business partner
            </Link>
          </div>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-cream-dark md:max-w-none">
            <AssetImage
              src="/products/dummy/hero.jpg"
              alt="DANDY bags — placeholder photography"
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 768px) 90vw, 480px"
            />
          </div>
        </div>
      </section>

      <div className="marquee bg-paper" aria-hidden>
        <div className="marquee-track text-[12px] tracking-[0.28em] text-ink-soft uppercase">
          {marquee.map((name, i) => (
            <span key={`${name}-${i}`} className="flex items-center gap-8">
              {name}
              <span className="text-camel">✦</span>
            </span>
          ))}
        </div>
      </div>

      <nav className="border-b border-ink/10 bg-paper" aria-label="Shop by category">
        <div className="hide-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-4 md:px-8">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="shrink-0 border border-ink/15 bg-cream px-4 py-2 text-[11px] tracking-[0.16em] whitespace-nowrap uppercase hover:border-ink hover:bg-ink hover:text-paper"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      <p className="bg-cream px-4 py-3 text-center text-[11px] tracking-[0.16em] text-ink-soft uppercase">
        Placeholder photos until the product shoot — your images will replace these
      </p>

      <div className="bg-paper">
        <ProductRail
          eyebrow="Bestsellers"
          title="Explore bestsellers"
          href="/shop"
          products={featured}
        />
      </div>

      <div className="bg-cream">
        <ProductRail
          eyebrow="New"
          title="Hot new arrivals"
          href="/shop"
          products={arrivals}
        />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-12">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-ink-soft uppercase">Shop by category</p>
            <h2 className="mt-2 font-serif text-4xl italic sm:text-5xl md:text-6xl">Seven ways to carry</h2>
          </div>
          <Link href="/categories" className="text-[11px] tracking-[0.2em] uppercase underline underline-offset-8">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-4 md:gap-5">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={c} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <p className="text-[11px] tracking-[0.28em] text-ink-soft uppercase">The journeys</p>
        <h2 className="mt-2 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">
          From school gates to weekend roads.
        </h2>
        <div className="mt-12 grid gap-px bg-ink/10 md:grid-cols-3">
          {journeys.map((j) => (
            <Link
              key={j.title}
              href={j.href}
              className="bg-paper px-6 py-10 transition hover:bg-cream"
            >
              <p className="font-serif text-3xl italic">{j.title}</p>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{j.line}</p>
              <span className="mt-8 inline-block text-[11px] tracking-[0.18em] uppercase">Shop →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-ink/10 bg-cream">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-8 md:py-24">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-ink-soft uppercase">The house</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
              A bag brand from Karur, made for real use.
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-ink-soft">
              Originally based in Erode, DANDY now operates from Karur, Tamil Nadu — with retail
              experience, manufacturing capability, and a dealer network built through trade.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-block text-[11px] tracking-[0.2em] uppercase underline underline-offset-8"
            >
              About Dandy
            </Link>
          </div>
          <div className="border border-ink/15 bg-paper p-8 md:p-12">
            <p className="text-[11px] tracking-[0.28em] text-ink-soft uppercase">For business</p>
            <h3 className="mt-3 font-serif text-3xl italic sm:text-4xl">Partner with DANDY</h3>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Wholesale and supply for retailers, dealers, distributors and bulk buyers.
            </p>
            <Link
              href="/wholesale"
              className="mt-8 inline-flex bg-camel px-6 py-3.5 text-[11px] tracking-[0.2em] text-ink uppercase"
            >
              Business enquiry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
