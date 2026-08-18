"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  sellingPrice: string | null;
  stock: number | null;
  b2cAvailable: boolean;
  featured: boolean;
  imageFront: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  id?: string;
  name: string;
  sku: string;
  slug: string;
  category: string;
  subcategory: string;
  sellingPrice: string;
  stock: string;
  b2cAvailable: boolean;
  featured: boolean;
  imageFront: string;
  imageBack: string;
  imageLeft: string;
  imageRight: string;
  imageTop: string;
  imageBottom: string;
  imageInside: string;
  imageZipper: string;
  imageStrap: string;
  imageLifestyle: string;
  colour: string;
  material: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  capacity: string;
  compartments: string;
  features: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  mrp: string;
};

const emptyForm: FormState = {
  name: "",
  sku: "",
  slug: "",
  category: "school-bags",
  subcategory: "",
  sellingPrice: "",
  stock: "",
  b2cAvailable: true,
  featured: false,
  imageFront: "",
  imageBack: "",
  imageLeft: "",
  imageRight: "",
  imageTop: "",
  imageBottom: "",
  imageInside: "",
  imageZipper: "",
  imageStrap: "",
  imageLifestyle: "",
  colour: "",
  material: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  capacity: "",
  compartments: "",
  features: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  mrp: "",
};

const categories = [
  "school-bags",
  "college-bags",
  "backpacks",
  "travel-bags",
  "sling-bags",
  "handbags",
  "ladies-purses",
];

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/products", { credentials: "include" });
    const data = (await res.json()) as { products?: Product[]; error?: string };
    if (!res.ok) setError(data.error || "Failed to load products.");
    else setProducts(data.products || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditing(false);
  }

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku,
      slug: product.slug,
      category: product.category,
      subcategory: product.subcategory,
      sellingPrice: product.sellingPrice || "",
      stock: product.stock !== null ? String(product.stock) : "",
      b2cAvailable: product.b2cAvailable,
      featured: product.featured,
      imageFront: product.imageFront,
      imageBack: "",
      imageLeft: "",
      imageRight: "",
      imageTop: "",
      imageBottom: "",
      imageInside: "",
      imageZipper: "",
      imageStrap: "",
      imageLifestyle: "",
      colour: "",
      material: "",
      weight: "",
      length: "",
      width: "",
      height: "",
      capacity: "",
      compartments: "",
      features: "",
      description: "",
      seoTitle: "",
      seoDescription: "",
      mrp: "",
    });
    setEditing(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      name: form.name,
      sku: form.sku,
      slug: form.slug,
      category: form.category,
      subcategory: form.subcategory,
      sellingPrice: form.sellingPrice || null,
      stock: form.stock === "" ? null : Number(form.stock),
      b2cAvailable: form.b2cAvailable,
      featured: form.featured,
      imageFront: form.imageFront,
      description: form.description,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
    };

    if (form.imageBack) payload.imageBack = form.imageBack;
    if (form.imageLeft) payload.imageLeft = form.imageLeft;
    if (form.imageRight) payload.imageRight = form.imageRight;
    if (form.imageTop) payload.imageTop = form.imageTop;
    if (form.imageBottom) payload.imageBottom = form.imageBottom;
    if (form.imageInside) payload.imageInside = form.imageInside;
    if (form.imageZipper) payload.imageZipper = form.imageZipper;
    if (form.imageStrap) payload.imageStrap = form.imageStrap;
    if (form.imageLifestyle) payload.imageLifestyle = form.imageLifestyle;
    if (form.colour) payload.colour = form.colour;
    if (form.material) payload.material = form.material;
    if (form.weight) payload.weight = form.weight;
    if (form.length) payload.length = form.length;
    if (form.width) payload.width = form.width;
    if (form.height) payload.height = form.height;
    if (form.capacity) payload.capacity = form.capacity;
    if (form.compartments) payload.compartments = form.compartments;
    if (form.features) payload.features = form.features.split(",").map((s) => s.trim()).filter(Boolean);
    if (form.mrp) payload.mrp = Number(form.mrp);

    const url = editing && form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { product?: Product; error?: string };
    if (!res.ok) setError(data.error || "Failed to save product.");
    else {
      setEditing(false);
      setForm(emptyForm);
      await load();
    }
    setSaving(false);
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setError("");
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) setError(data.error || "Failed to delete product.");
    else await load();
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs uppercase tracking-[0.16em] underline">
            Admin
          </Link>
          <h1 className="mt-4 font-serif text-4xl">Products</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="h-10 bg-ink px-4 text-[11px] tracking-[0.16em] uppercase text-paper"
        >
          Add Product
        </button>
      </div>

      {error ? <p className="mt-6 text-sm text-red-800">{error}</p> : null}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2">Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>B2C</th>
              <th>Featured</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-6 text-ink-soft">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="py-6 text-ink-soft">No products yet.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-ink/5">
                  <td className="py-3">
                    <p className="font-serif">{p.name}</p>
                    <p className="text-xs text-ink-soft">{p.slug}</p>
                  </td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.category}</td>
                  <td>{p.sellingPrice ? `₹${Number(p.sellingPrice).toLocaleString("en-IN")}` : "—"}</td>
                  <td>{p.stock !== null ? p.stock : "∞"}</td>
                  <td>{p.b2cAvailable ? "Yes" : "No"}</td>
                  <td>{p.featured ? "Yes" : "No"}</td>
                  <td className="space-x-3 text-right">
                    <button type="button" onClick={() => openEdit(p)} className="underline">Edit</button>
                    <button type="button" onClick={() => handleDelete(p)} className="text-red-800 underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(editing || form.name) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl rounded bg-paper p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">{editing ? "Edit Product" : "New Product"}</h2>
              <button type="button" onClick={() => { setEditing(false); setForm(emptyForm); }} className="text-sm underline">Close</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Name *
                <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                SKU *
                <input required value={form.sku} onChange={(e) => updateField("sku", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm font-mono" />
              </label>
              <label className="block text-sm">
                Slug *
                <input required value={form.slug} onChange={(e) => updateField("slug", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm font-mono" />
              </label>
              <label className="block text-sm">
                Category *
                <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm">
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Subcategory
                <input value={form.subcategory} onChange={(e) => updateField("subcategory", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Selling Price (₹)
                <input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => updateField("sellingPrice", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Stock (leave empty for unlimited)
                <input type="number" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Front Image *
                <input required value={form.imageFront} onChange={(e) => updateField("imageFront", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Lifestyle Image
                <input value={form.imageLifestyle} onChange={(e) => updateField("imageLifestyle", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Back Image
                <input value={form.imageBack} onChange={(e) => updateField("imageBack", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Left Image
                <input value={form.imageLeft} onChange={(e) => updateField("imageLeft", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Right Image
                <input value={form.imageRight} onChange={(e) => updateField("imageRight", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Top Image
                <input value={form.imageTop} onChange={(e) => updateField("imageTop", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Bottom Image
                <input value={form.imageBottom} onChange={(e) => updateField("imageBottom", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Inside Image
                <input value={form.imageInside} onChange={(e) => updateField("imageInside", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Zipper Image
                <input value={form.imageZipper} onChange={(e) => updateField("imageZipper", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Strap Image
                <input value={form.imageStrap} onChange={(e) => updateField("imageStrap", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Colour
                <input value={form.colour} onChange={(e) => updateField("colour", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Material
                <input value={form.material} onChange={(e) => updateField("material", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Weight
                <input value={form.weight} onChange={(e) => updateField("weight", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Length
                <input value={form.length} onChange={(e) => updateField("length", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Width
                <input value={form.width} onChange={(e) => updateField("width", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Height
                <input value={form.height} onChange={(e) => updateField("height", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Capacity
                <input value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Compartments
                <input value={form.compartments} onChange={(e) => updateField("compartments", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm sm:col-span-2">
                Features (comma-separated)
                <input value={form.features} onChange={(e) => updateField("features", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm sm:col-span-2">
                Description
                <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm sm:col-span-2">
                SEO Title
                <input value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm sm:col-span-2">
                SEO Description
                <textarea value={form.seoDescription} onChange={(e) => updateField("seoDescription", e.target.value)} rows={2} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.b2cAvailable} onChange={(e) => updateField("b2cAvailable", e.target.checked)} />
                B2C Available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured} onChange={(e) => updateField("featured", e.target.checked)} />
                Featured
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setEditing(false); setForm(emptyForm); }} className="text-sm underline">Cancel</button>
              <button type="submit" disabled={saving} className="h-10 bg-ink px-5 text-[11px] tracking-[0.16em] uppercase text-paper disabled:opacity-60">
                {saving ? "Saving..." : editing ? "Update Product" : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
