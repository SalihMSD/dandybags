"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { ProductForm } from "@/components/admin/ProductForm";
import { formatInr } from "@/lib/format";

type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  sellingPrice: string | null;
  mrp: string | null;
  stock: number | null;
  b2cAvailable: boolean;
  featured: boolean;
  discountPercent: number;
  imageFront: string;
  createdAt: string;
  updatedAt: string;
};

type PaginatedResponse = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const CATEGORIES = [
  "school-bags",
  "college-bags",
  "backpacks",
  " travel-bags",
  "sling-bags",
  "handbags",
  "ladies-purses",
];

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [b2cFilter, setB2cFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkStockValue, setBulkStockValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  function buildParams() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (search) params.set("search", search);
    if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
    if (b2cFilter && b2cFilter !== "all") params.set("b2cAvailable", b2cFilter);
    if (stockFilter && stockFilter !== "all") params.set("stockStatus", stockFilter);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortDir) params.set("sortDir", sortDir);
    return params;
  }

  async function load() {
    setLoading(true);
    setError("");
    const params = buildParams();
    const res = await fetch(`/api/admin/products?${params.toString()}`, { credentials: "include" });
    const data = (await res.json()) as PaginatedResponse | { error?: string };
    if (!res.ok) {
      setError((data as { error?: string }).error || "Failed to load products.");
    } else {
      const d = data as PaginatedResponse;
      setProducts(d.products || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [page, search, categoryFilter, b2cFilter, stockFilter, sortBy, sortDir]);

  function openCreate() {
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    setEditingId(null);
    void load();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  async function runBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    setActionLoading(true);
    setError("");

    let body: Record<string, unknown> = { ids: Array.from(selected) };

    if (bulkAction === "activate") body.b2cAvailable = true;
    else if (bulkAction === "deactivate") body.b2cAvailable = false;
    else if (bulkAction === "set-stock") body.stock = bulkStockValue === "" ? null : Number(bulkStockValue);
    else if (bulkAction === "delete") {
      if (!confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) {
        setActionLoading(false);
        return;
      }
    }

    const method = bulkAction === "delete" ? "DELETE" : "PATCH";
    const res = await fetch("/api/admin/products", {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Bulk action failed.");
    } else {
      setSelected(new Set());
      setBulkAction("");
      void load();
    }
    setActionLoading(false);
  }

  function getStockDisplay(product: Product) {
    if (product.stock === null) return { text: "∞ Unlimited", color: "text-ink-soft" };
    if (product.stock === 0) return { text: "0 — Out of stock", color: "text-red-800 font-medium" };
    if (product.stock < 10) return { text: `${product.stock} — Low stock`, color: "text-camel-dark font-medium" };
    return { text: `${product.stock} — In stock`, color: "text-green-800" };
  }

  const stockStatusApplied = stockFilter && stockFilter !== "all";

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by name, SKU, category..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-64 rounded border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.trim()} value={c.trim()}>{c.trim()}</option>
              ))}
            </select>
            <select
              value={b2cFilter}
              onChange={(e) => { setB2cFilter(e.target.value); setPage(1); }}
              className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
            >
              <option value="all">B2C Availability</option>
              <option value="available">Available for sale</option>
              <option value="unavailable">Not for sale</option>
            </select>
            <select
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
              className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
            >
              <option value="all">All Stock</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
              <option value="unlimited">Unlimited</option>
            </select>
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [s, d] = e.target.value.split("-");
                setSortBy(s);
                setSortDir(d);
              }}
              className="rounded border border-ink/10 bg-paper px-3 py-2 text-sm"
            >
              <option value="created-desc">Newest first</option>
              <option value="created-asc">Oldest first</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
              <option value="stock-asc">Stock low to high</option>
              <option value="stock-desc">Stock high to low</option>
            </select>
          </div>
          <button
            onClick={openCreate}
            className="h-10 bg-ink px-4 text-[11px] tracking-[0.16em] uppercase text-paper"
          >
            Add Product
          </button>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded border border-ink/10 bg-paper px-4 py-3">
            <span className="text-sm">{selected.size} selected</span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="rounded border border-ink/10 bg-paper px-3 py-1.5 text-sm"
            >
              <option value="">Bulk actions…</option>
              <option value="activate">Activate (B2C available)</option>
              <option value="deactivate">Deactivate (B2C unavailable)</option>
              <option value="set-stock">Update Stock</option>
              <option value="delete">Delete (confirm required)</option>
            </select>
            {bulkAction === "set-stock" && (
              <input
                type="number"
                value={bulkStockValue}
                onChange={(e) => setBulkStockValue(e.target.value)}
                placeholder="Stock (empty = unlimited)"
                className="w-40 rounded border border-ink/10 bg-paper px-2 py-1 text-sm outline-none focus:border-ink"
              />
            )}
            <button
              onClick={runBulkAction}
              disabled={actionLoading || !bulkAction}
              className="h-8 bg-camel px-3 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
            >
              {actionLoading ? "Applying…" : "Apply"}
            </button>
            <button
              onClick={() => {
                setSelected(new Set());
                setBulkAction("");
                setBulkStockValue("");
              }}
              className="text-xs underline"
            >
              Clear
            </button>
          </div>
        )}

        {error ? <p className="text-sm text-red-800">{error}</p> : null}

        <div className="overflow-x-auto rounded border border-ink/10">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="py-2">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selected.size === products.length}
                    onChange={selectAll}
                    disabled={loading}
                  />
                </th>
                <th className="py-2">Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>MRP</th>
                <th>Stock</th>
                <th>B2C</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-ink-soft">Loading products…</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-ink-soft">
                    {search || stockStatusApplied || categoryFilter !== "all" || b2cFilter !== "all"
                      ? "No products match your filters."
                      : "No products found."}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const stock = getStockDisplay(p);
                  return (
                    <tr key={p.id} className="border-b border-ink/5">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative aspect-[4/5] h-12 w-12 overflow-hidden bg-cream">
                            <AssetImage src={p.imageFront} alt={p.name} fill className="object-cover object-center" sizes="48px" />
                          </div>
                          <div>
                            <p className="font-serif">{p.name}</p>
                            <p className="text-xs text-ink-soft">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{p.sku}</td>
                      <td className="text-ink-soft">{p.category}</td>
                      <td>{p.sellingPrice ? formatInr(Number(p.sellingPrice)) : "—"}</td>
                      <td>{p.mrp ? formatInr(Number(p.mrp)) : "—"}</td>
                      <td>
                        <span className={stock.color}>{stock.text}</span>
                      </td>
                      <td>{p.b2cAvailable ? "Yes" : "No"}</td>
                      <td className="text-ink-soft">
                        {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/shop/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View storefront"
                            className="text-xs underline"
                          >
                            Preview
                          </Link>
                          <button onClick={() => openEdit(p)} className="text-xs underline">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">
              Page {page} of {totalPages} — {total} product{total !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-9 border border-ink px-3 text-xs uppercase disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-9 border border-ink px-3 text-xs uppercase disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ProductForm
          productId={editingId}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
