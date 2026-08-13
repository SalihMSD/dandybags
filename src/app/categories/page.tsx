import type { Metadata } from "next";
import { CategoryCard } from "@/components/CategoryCard";
import { categories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Bag categories",
  description: "School bags, college bags, backpacks, travel bags, sling bags, handbags and ladies purses from DANDY.",
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Categories</h1>
      <p className="mt-3 max-w-xl text-ink-soft">Seven focused collections. Nothing else.</p>
      <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <CategoryCard key={c.slug} category={c} />
        ))}
      </div>
    </div>
  );
}
