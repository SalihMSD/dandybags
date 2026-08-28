import Link from "next/link";
import type { Metadata } from "next";
import { AssetImage } from "@/components/AssetImage";
import { CategoryCard } from "@/components/CategoryCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { ProductRail } from "@/components/ProductRail";
import { categories } from "@/lib/categories";
import { listFeaturedProducts, listNewArrivals, type Product } from "@/lib/db/products";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "DANDY — Bags for every journey",
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "DANDY — Bags for every journey",
    description: site.description,
    url: "/",
    siteName: "DANDY",
  },
  twitter: {
    card: "summary_large_image",
    title: "DANDY — Bags for every journey",
    description: site.description,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  description: site.description,
  url: "https://dandy-bags-staging.vercel.app",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-90252-66485",
    contactType: "customer service",
    areaServed: "IN",
    availableLanguage: ["English", "Tamil"],
  },
};

const journeys = [
  { title: "School", line: "Made for the everyday route to class.", href: "/categories/school-bags" },
  { title: "Campus", line: "For college days and the commute between them.", href: "/categories/college-bags" },
  { title: "Travel", line: "Packed for weekends and longer roads.", href: "/categories/travel-bags" },
];

export default async function HomePage() {
  let featured: Product[] = [];
  let arrivals: Product[] = [];

  try {
    const results = await Promise.all([
      listFeaturedProducts(8),
      listNewArrivals(8),
    ]);
    featured = results[0];
    arrivals = results[1];
  } catch {
    featured = [];
    arrivals = [];
  }

  const marquee = [...categories, ...categories].map((c) => c.name);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HeroCarousel />

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
        Explore thoughtfully designed bags for school, college, travel and everyday life.
      </p>

      <section className="animate-slide-up border-b border-ink/10 bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] tracking-[0.28em] text-ink-soft uppercase">Share & Earn</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl md:text-5xl">
              Share your Dandy Bag &amp; earn rewards
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
              Post your Dandy Bag on Instagram and tag <strong>@dandybagsonline.in</strong>.
              <br />
              Story for 24 hours → Earn <strong>5% of your paid bill</strong> as a coupon.
              <br />
              Story + Post → Earn <strong>10% of your paid bill</strong> as a coupon.
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              Tagging <strong>@dandybagsonline.in</strong> is required.
            </p>
            <Link
              href="/account/share-rewards"
              className="mt-8 inline-block h-12 bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase transition-transform duration-200 hover:scale-105"
            >
              Share & Earn
            </Link>
          </div>
        </div>
      </section>

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

      <section className="border-t border-ink/10 bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center md:px-8">
          <Link
            href="/wholesale"
            className="inline-block text-[11px] tracking-[0.2em] uppercase underline underline-offset-8"
          >
            Become a business partner
          </Link>
        </div>
      </section>
    </div>
  );
}
