import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { getCategory, categories } from "@/lib/categories";
import { getSessionUser } from "@/lib/auth/session";
import { getWishlistSkus } from "@/lib/db/wishlist";
import { listProductsByCategory } from "@/lib/db/products";

type Props = { params: Promise<{ slug: string }> };

// Evaluated at build time. True only during the GitHub Pages static export.
const isStaticBuild = process.env.GITHUB_PAGES === "true";

// Enumerate routes from the static categories array — no DB needed.
// On Vercel (no `output: export`) Next.js ignores this for SSR routes.
export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) return {};
  return {
    title: c.name,
    description: `${c.description} DANDY bags, Karur, Tamil Nadu.`,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title: c.name,
      description: `${c.description} DANDY bags, Karur, Tamil Nadu.`,
      url: `/categories/${slug}`,
      siteName: "DANDY",
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: c.name,
      description: `${c.description} DANDY bags, Karur, Tamil Nadu.`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) notFound();

  // GitHub Pages: skip all DB/session calls — no DATABASE_URL in CI.
  const products = isStaticBuild ? [] : await listProductsByCategory(c.slug);
  const user = isStaticBuild ? null : await getSessionUser();
  const wishlistSkus = user ? await getWishlistSkus(user.id) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-8">
      <p className="text-[11px] tracking-[0.2em] uppercase">Collection</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{c.name}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{c.description}</p>

      {isStaticBuild ? (
        // GitHub Pages: CTA to live store for this category.
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-ink-soft">View all {c.name} products on our online store.</p>
          <a
            href={`https://www.dandyonline.in/categories/${slug}`}
            className="inline-block rounded bg-ink px-8 py-3 text-sm font-semibold text-white hover:bg-ink/90"
          >
            Browse {c.name} →
          </a>
        </div>
      ) : (
        // Vercel production: existing DB-backed grid, unchanged.
        <div className="mt-8 grid grid-cols-2 items-stretch gap-2.5 sm:mt-10 sm:gap-4 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.sku} product={p} priority={i < 4} saved={wishlistSkus.includes(p.sku)} />
          ))}
        </div>
      )}
    </div>
  );
}
