import Link from "next/link";
import { type Category } from "@/lib/categories";
import { AssetImage } from "./AssetImage";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/categories/${category.slug}`} className="group flex h-full flex-col bg-cream">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-dark">
        <AssetImage
          src={category.image}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover object-center transition duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-serif text-xl text-ink sm:text-2xl">{category.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-ink-soft">{category.short}</p>
        <span className="mt-auto pt-3 inline-block text-[10px] tracking-[0.2em] uppercase">
          Explore →
        </span>
      </div>
    </Link>
  );
}
