import Link from "next/link";
import { type Category } from "@/lib/categories";
import { AssetImage } from "./AssetImage";

export function CategoryCard({
  category,
  featured = false,
}: {
  category: Category;
  featured?: boolean;
}) {
  return (
    <Link href={`/categories/${category.slug}`} className="group block h-full">
      <div
        className={`relative overflow-hidden ${featured ? "aspect-[16/10] md:aspect-[16/9]" : "aspect-[4/5]"}`}
      >
        <AssetImage
          src={category.image}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <h3 className="font-serif text-xl text-paper sm:text-2xl md:text-3xl">{category.name}</h3>
          <p className="mt-1 hidden text-sm text-paper/80 sm:block">{category.short}</p>
          <span className="mt-3 inline-block text-[10px] tracking-[0.2em] text-gold uppercase">
            Explore
          </span>
        </div>
      </div>
    </Link>
  );
}
