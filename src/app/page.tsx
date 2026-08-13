import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { categories } from "@/lib/categories";
import { featuredProducts } from "@/lib/products";
import { site } from "@/lib/site";

const journeys = [
  { title: "School", line: "Made for the everyday route to class.", href: "/categories/school-bags" },
  { title: "Campus", line: "For college days and the commute between them.", href: "/categories/college-bags" },
  { title: "Travel", line: "Packed for weekends and longer roads.", href: "/categories/travel-bags" },
];

export default function HomePage() {
  const featured = featuredProducts();
  const marquee = [...categories, ...categories].map((c) => c.name);

  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-gold/25" />
        <div className="pointer-events-none absolute -bottom-32 left-[-10%] h-[28rem] w-[28rem] rounded-full border border-gold/15" />
        <div className="mx-auto grid min-h-[88vh] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-20">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.32em] text-gold uppercase">{site.tagline}</p>
            <h1 className="mt-6 font-serif text-[clamp(3.4rem,12vw,8.5rem)] leading-[0.85] tracking-tight">
              Bags for
              <br />
              <span className="italic text-gold">every journey</span>
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-paper/75 md:text-lg">
              {site.heroSupport}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/shop"
                className="bg-gold px-8 py-4 text-center text-[12px] tracking-[0.22em] text-ink uppercase"
              >
                Shop bags
              </Link>
              <Link
                href="/categories"
                className="border border-paper/40 px-8 py-4 text-center text-[12px] tracking-[0.22em] uppercase hover:border-gold"
              >
                Explore collection
              </Link>
            </div>
            <Link
              href="/wholesale"
              className="mt-6 inline-block text-[11px] tracking-[0.2em] text-gold uppercase"
            >
              Become a business partner →
            </Link>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[280px] md:max-w-lg">
            <div className="absolute inset-[8%] rounded-full bg-gold/10 blur-2xl" />
            <AssetImage
              src="/logo-mark.png"
              alt="DANDY emblem"
              fill
              priority
              className="object-contain drop-shadow-2xl invert"
              sizes="(max-width: 768px) 280px, 480px"
            />
          </div>
        </div>
      </section>

      <div className="marquee bg-cream" aria-hidden>
        <div className="marquee-track text-[12px] tracking-[0.28em] uppercase">
          {marquee.map((name, i) => (
            <span key={`${name}-${i}`} className="flex items-center gap-8">
              {name}
              <span className="text-gold">✦</span>
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-12">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-gold uppercase">The collection</p>
            <h2 className="mt-2 font-serif text-4xl italic sm:text-5xl md:text-6xl">Seven ways to carry</h2>
          </div>
          <Link href="/categories" className="text-[11px] tracking-[0.2em] uppercase underline underline-offset-8">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {categories.map((c, i) => (
            <div key={c.slug} className={i === 0 || i === 3 ? "col-span-2" : ""}>
              <CategoryCard category={c} featured={i === 0 || i === 3} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Selected</p>
          <h2 className="mt-2 font-serif text-4xl sm:text-5xl">Featured bags</h2>
          <p className="mt-3 max-w-xl text-sm text-ink-soft">
            Photography and retail prices will be published after the product shoot.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featured.map((p, i) => (
              <div key={p.sku} className={i === 0 ? "col-span-2" : ""}>
                <ProductCard product={p} large={i === 0} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">The journeys</p>
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

      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-8 md:py-24">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-gold uppercase">The house</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
              A bag brand from Karur, made for real use.
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-paper/70">
              Originally based in Erode, DANDY now operates from Karur, Tamil Nadu — with retail
              experience, manufacturing capability, and a dealer network built through trade.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-block text-[11px] tracking-[0.2em] text-gold uppercase"
            >
              About Dandy →
            </Link>
          </div>
          <div className="border border-gold/30 p-8 md:p-12">
            <p className="text-[11px] tracking-[0.28em] text-gold uppercase">For business</p>
            <h3 className="mt-3 font-serif text-3xl italic sm:text-4xl">Partner with DANDY</h3>
            <p className="mt-4 text-sm leading-relaxed text-paper/70">
              Wholesale and supply for retailers, dealers, distributors and bulk buyers.
            </p>
            <Link
              href="/wholesale"
              className="mt-8 inline-flex bg-gold px-6 py-3.5 text-[11px] tracking-[0.2em] text-ink uppercase"
            >
              Business enquiry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
