import Link from "next/link";
import { type Category } from "@/lib/categories";
import { AssetImage } from "./AssetImage";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group block border border-ink/10 bg-cream transition hover:border-ink/30"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-dark">
        <AssetImage
          src={category.image}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-4 md:p-5">
        <h3 className="font-serif text-xl tracking-wide">{category.name}</h3>
        <p className="mt-1 text-sm text-ink-soft">{category.short}</p>
        <span className="mt-3 inline-block text-[11px] tracking-[0.16em] uppercase">
          Explore →
        </span>
      </div>
    </Link>
  );
}
