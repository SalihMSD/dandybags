"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { addToCart } from "@/lib/cart";
import { type Product } from "@/lib/products";

export default function WishlistPage() {
  const [items, setItems] = useState<Product[]>([]);

  async function load() {
    const res = await fetch("/api/customer/wishlist", { credentials: "include" });
    const data = (await res.json()) as { items: Product[] };
    setItems(data.items || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(sku: string) {
    await fetch("/api/customer/wishlist", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">My Wishlist</h1>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">
          Your wishlist is empty.{" "}
          <Link href="/shop" className="underline">
            Shop bags
          </Link>
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.sku}>
              <ProductCard product={p} />
              <div className="mt-2 flex gap-2 text-[10px] tracking-[0.14em] uppercase">
                <button type="button" className="flex-1 border border-ink/15 py-2" onClick={() => addToCart(p)}>
                  Move to cart
                </button>
                <button type="button" className="flex-1 border border-ink/15 py-2" onClick={() => void remove(p.sku)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
