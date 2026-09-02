"use client";

import { useEffect, useState } from "react";
import { AssetImage } from "@/components/AssetImage";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  sellingPrice: string | null;
  stock: number | null;
  b2cAvailable: boolean;
  imageFront: string;
  discountPercent: number;
};

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetch("/api/admin/products", { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as { products?: Product[]; error?: string };
        if (!res.ok) setError(data.error || "Failed to load products.");
        else setProducts(data.products || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const lowStock = filtered.filter((p) => p.stock !== null && p.stock < 10);
  const outOfStock = filtered.filter((p) => p.stock === 0);
  const unlimited = filtered.filter((p) => p.stock === null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <div className="flex gap-4 text-sm">
          <span className="text-camel-dark">Low Stock: {lowStock.length}</span>
          <span className="text-red-800">Out: {outOfStock.length}</span>
          <span className="text-ink-soft">Unlimited: {unlimited.length}</span>
        </div>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2">Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-soft">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-soft">No products found.</td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isLow = p.stock !== null && p.stock < 10;
                const isZero = p.stock === 0;
                return (
                  <tr key={p.id} className="border-b border-ink/5">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative aspect-[4/5] h-12 w-12 overflow-hidden bg-cream">
                          <AssetImage src={p.imageFront} alt={p.name} fill className="object-cover" sizes="48px" />
                        </div>
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{p.sku}</td>
                    <td>{p.category}</td>
                    <td>
                      {p.stock === null ? (
                        <span className="text-ink-soft">∞ (unlimited)</span>
                      ) : (
                        <span className={isZero ? "text-red-800 font-medium" : isLow ? "text-camel-dark font-medium" : ""}>
                          {p.stock}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        isZero ? "bg-red-50 text-red-800" : isLow ? "bg-camel/20 text-ink" : "bg-green-50 text-green-800"
                      }`}>
                        {isZero ? "Out of Stock" : isLow ? "Low Stock" : p.b2cAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
