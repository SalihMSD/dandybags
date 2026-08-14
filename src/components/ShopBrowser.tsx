"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { categories, type CategorySlug } from "@/lib/categories";
import { type Product } from "@/lib/products";
import { ProductCard } from "./ProductCard";

type Sort = "featured" | "newest" | "price-asc" | "price-desc";

export function ShopBrowser({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState<string>(params.get("category") || "all");
  const [avail, setAvail] = useState("all");
  const [sort, setSort] = useState<Sort>("featured");
  const [colour, setColour] = useState("all");

  const colours = useMemo(
    () => Array.from(new Set(products.map((p) => p.colour))),
    [products],
  );

  const list = useMemo(() => {
    let rows = products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (avail === "b2c" && !p.b2cAvailable) return false;
      if (colour !== "all" && p.colour !== colour) return false;
      if (q && !`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
    if (sort === "featured") rows = [...rows].sort((a, b) => Number(b.featured) - Number(a.featured));
    if (sort === "newest") rows = [...rows].reverse();
    if (sort === "price-asc")
      rows = [...rows].sort((a, b) => (a.sellingPrice ?? 1e12) - (b.sellingPrice ?? 1e12));
    if (sort === "price-desc")
      rows = [...rows].sort((a, b) => (b.sellingPrice ?? -1) - (a.sellingPrice ?? -1));
    return rows;
  }, [products, q, cat, avail, colour, sort]);

  const select = "h-11 w-full border border-ink/15 bg-paper px-3 text-base md:text-sm";

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className={select}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={select}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={colour} onChange={(e) => setColour(e.target.value)} className={select}>
          <option value="all">All colours</option>
          {colours.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={avail} onChange={(e) => setAvail(e.target.value)} className={select}>
          <option value="all">Availability</option>
          <option value="b2c">Available to shop</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={select}>
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price low to high</option>
          <option value="price-desc">Price high to low</option>
        </select>
      </div>
      <p className="mb-6 text-sm text-ink-soft">{list.length} bags</p>
      <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        {list.map((p) => (
          <ProductCard key={p.sku} product={p} />
        ))}
      </div>
    </div>
  );
}

export type { CategorySlug };
