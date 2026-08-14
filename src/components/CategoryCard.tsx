import Link from "next/link";
import { type Category } from "@/lib/categories";
import { AssetImage } from "./AssetImage";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-cream ring-1 ring-ink/8 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-20px_rgba(58,58,57,0.55)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-2xl bg-cream-dark">
        <AssetImage
          src={category.image}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.08]"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-sans text-lg font-semibold tracking-tight text-ink sm:text-xl">
          {category.name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-ink-soft">{category.short}</p>
        <span className="mt-auto inline-block pt-3 text-[10px] tracking-[0.2em] uppercase">
          Explore →
        </span>
      </div>
    </Link>
  );
}
