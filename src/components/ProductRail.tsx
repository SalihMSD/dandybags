import Link from "next/link";
import { type Product } from "@/lib/db/products";
import { ProductCard } from "./ProductCard";

export function ProductRail({
  eyebrow,
  title,
  href,
  products,
}: {
  eyebrow: string;
  title: string;
  href: string;
  products: Product[];
}) {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-ink-soft uppercase">{eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl md:text-5xl">{title}</h2>
          </div>
          <Link href={href} className="shrink-0 text-[11px] tracking-[0.2em] uppercase underline underline-offset-8">
            View all
          </Link>
        </div>
        <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {products.map((p, i) => (
            <div key={p.sku} className="w-[46%] shrink-0 snap-start sm:w-auto">
              <ProductCard product={p} priority={i < 4} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
