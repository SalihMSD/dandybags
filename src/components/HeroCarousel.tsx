"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { categories, type CategorySlug } from "@/lib/categories";
import { site } from "@/lib/site";

const heroImages = [
  { src: "/products/dummy/school-classic.jpg", alt: "School Bag Classic", category: "school-bags" as CategorySlug },
  { src: "/products/dummy/college-campus.jpg", alt: "College Bag Campus", category: "college-bags" as CategorySlug },
  { src: "/products/dummy/everyday-backpack.jpg", alt: "Everyday Backpack", category: "backpacks" as CategorySlug },
  { src: "/products/dummy/weekender.jpg", alt: "Weekender Travel Bag", category: "travel-bags" as CategorySlug },
  { src: "/products/dummy/everyday-sling.jpg", alt: "Everyday Sling", category: "sling-bags" as CategorySlug },
  { src: "/products/dummy/everyday-handbag.jpg", alt: "Everyday Handbag", category: "handbags" as CategorySlug },
  { src: "/products/dummy/classic-purse.jpg", alt: "Classic Purse", category: "ladies-purses" as CategorySlug },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % heroImages.length);
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const current = heroImages[index];

  return (
    <section
      className="relative overflow-hidden bg-cream"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:gap-12 md:px-8 md:py-16">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.32em] text-ink-soft uppercase">{site.tagline}</p>
          <h1 className="mt-6 font-serif text-[clamp(3.2rem,11vw,7.5rem)] leading-[0.88] tracking-tight text-ink">
            Bags for
            <br />
            <span className="italic">every journey</span>
          </h1>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-soft md:text-lg">
            {site.heroSupport}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/categories/${current.category}`}
              className="bg-camel px-8 py-4 text-center text-[12px] tracking-[0.22em] text-ink uppercase"
            >
              Shop {categories.find((c) => c.slug === current.category)?.name || "now"}
            </Link>
            <Link
              href="/categories"
              className="border border-ink px-8 py-4 text-center text-[12px] tracking-[0.22em] uppercase hover:bg-ink hover:text-paper"
            >
              Explore collection
            </Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-cream-dark md:max-w-none">
          {heroImages.map((img, i) => (
            <AssetImage
              key={img.src}
              src={img.src}
              alt={img.alt}
              fill
              priority={i === 0}
              className={`object-cover object-[center_40%] transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 768px) 90vw, 480px"
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {heroImages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-ink" : "w-1.5 bg-ink/30"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
