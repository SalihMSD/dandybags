import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { categories, getCategory } from "@/lib/categories";
import { listProductsByCategory } from "@/lib/db/products";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) return {};
  return {
    title: c.name,
    description: `${c.description} DANDY bags, Karur, Tamil Nadu.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) notFound();
  const products = await listProductsByCategory(c.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-8">
      <p className="text-[11px] tracking-[0.2em] uppercase">Collection</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{c.name}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{c.description}</p>
      <div className="mt-8 grid grid-cols-2 items-stretch gap-2.5 sm:mt-10 sm:gap-4 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.sku} product={p} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}
