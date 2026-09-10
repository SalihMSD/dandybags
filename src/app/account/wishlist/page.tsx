"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { addToCart, cartCount } from "@/lib/cart";
import { type Product } from "@/lib/db/products";

type MoveStatus = "idle" | "moving" | "done" | "error";

export default function WishlistPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [moveStatus, setMoveStatus] = useState<Record<string, MoveStatus>>({});
  const [removeStatus, setRemoveStatus] = useState<Record<string, "idle" | "removing" | "error">>({});
  const [error, setError] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/customer/wishlist", { credentials: "include" });
    const data = (await res.json()) as { items: Product[] };
    setItems(data.items || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(sku: string) {
    if (removeStatus[sku] === "removing") return;
    setRemoveStatus((s) => ({ ...s, [sku]: "removing" }));
    setError((s) => {
      const next = { ...s };
      delete next[sku];
      return next;
    });

    try {
      const res = await fetch("/api/customer/wishlist", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to remove item.");
      }

      setItems((prev) => prev.filter((p) => p.sku !== sku));
      setRemoveStatus((s) => ({ ...s, [sku]: "idle" }));
    } catch (err) {
      setError((s) => ({
        ...s,
        [sku]: err instanceof Error ? err.message : "Failed to remove item.",
      }));
      setRemoveStatus((s) => ({ ...s, [sku]: "error" }));
    }
  }

  async function moveToCart(product: Product) {
    const sku = product.sku;
    if (moveStatus[sku] === "moving") return;

    setMoveStatus((s) => ({ ...s, [sku]: "moving" }));
    setError((s) => {
      const next = { ...s };
      delete next[sku];
      return next;
    });

    try {
      addToCart(product);
    } catch {
      setError((s) => ({ ...s, [sku]: "Could not add to cart." }));
      setMoveStatus((s) => ({ ...s, [sku]: "error" }));
      return;
    }

    try {
      const res = await fetch("/api/customer/wishlist", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to update wishlist.");
      }

      setItems((prev) => prev.filter((p) => p.sku !== sku));
      setMoveStatus((s) => ({ ...s, [sku]: "done" }));
    } catch (err) {
      setError((s) => ({
        ...s,
        [sku]:
          err instanceof Error
            ? err.message
            : "Failed to remove from wishlist. The item is in your cart.",
      }));
      setMoveStatus((s) => ({ ...s, [sku]: "error" }));
    }
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
          {items.map((p) => {
            const isMoving = moveStatus[p.sku] === "moving";
            const isRemoving = removeStatus[p.sku] === "removing";
            const isPending = isMoving || isRemoving;
            const itemError = error[p.sku];

            return (
              <div key={p.sku} className="flex h-full flex-col">
                <div className="flex-1">
                  <ProductCard product={p} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void moveToCart(p)}
                    className="w-full min-h-[44px] whitespace-nowrap rounded-lg border border-ink/15 px-2 py-2 text-center text-[10px] font-medium tracking-[0.08em] uppercase transition-colors duration-200 hover:bg-ink/5 disabled:opacity-60 disabled:cursor-not-allowed sm:px-3 sm:py-2.5 sm:text-[11px] sm:tracking-[0.12em]"
                  >
                    {isMoving ? "Moving..." : "Move to cart"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void remove(p.sku)}
                    className="w-full min-h-[44px] whitespace-nowrap rounded-lg border border-ink/15 px-2 py-2 text-center text-[10px] font-medium tracking-[0.08em] uppercase transition-colors duration-200 hover:bg-ink/5 disabled:opacity-60 disabled:cursor-not-allowed sm:px-3 sm:py-2.5 sm:text-[11px] sm:tracking-[0.12em]"
                  >
                    {isRemoving ? "Removing..." : "Remove"}
                  </button>
                </div>
                {itemError ? (
                  <p className="mt-1.5 text-[11px] text-red-700">{itemError}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
