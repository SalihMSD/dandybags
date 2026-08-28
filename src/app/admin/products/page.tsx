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
  imageBack: string;
  imageLeft: string;
  imageRight: string;
  imageTop: string;
  discountPercent: number;
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
  masterImage: string;
  sideImage1: string;
  sideImage2: string;
  sideImage3: string;
  sideImage4: string;
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
  discountPercent: string;
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
  masterImage: "",
  sideImage1: "",
  sideImage2: "",
  sideImage3: "",
  sideImage4: "",
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
  discountPercent: "0",
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
  const [showForm, setShowForm] = useState(false);

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
    setShowForm(true);
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
      masterImage: product.imageFront,
      sideImage1: product.imageBack || "",
      sideImage2: product.imageLeft || "",
      sideImage3: product.imageRight || "",
      sideImage4: product.imageTop || "",
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
      discountPercent: String(product.discountPercent || 0),
    });
    setEditing(true);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const mrp = form.mrp ? Number(form.mrp) : null;
    const discountPercent = form.discountPercent ? Number(form.discountPercent) : 0;
    let sellingPrice = form.sellingPrice ? Number(form.sellingPrice) : null;

    if (mrp !== null && discountPercent > 0) {
      const calculated = mrp * (1 - discountPercent / 100);
      sellingPrice = Math.round(calculated * 100) / 100;
    }

    const payload: Record<string, unknown> = {
      name: form.name,
      sku: form.sku,
      slug: form.slug,
      category: form.category,
      subcategory: form.subcategory,
      sellingPrice: sellingPrice,
      stock: form.stock === "" ? null : Number(form.stock),
      b2cAvailable: form.b2cAvailable,
      featured: form.featured,
      imageFront: form.masterImage,
      description: form.description,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      discountPercent,
    };

    if (form.sideImage1) payload.imageBack = form.sideImage1;
    if (form.sideImage2) payload.imageLeft = form.sideImage2;
    if (form.sideImage3) payload.imageRight = form.sideImage3;
    if (form.sideImage4) payload.imageTop = form.sideImage4;
    if (form.colour) payload.colour = form.colour;
    if (form.material) payload.material = form.material;
    if (form.weight) payload.weight = form.weight;
    if (form.length) payload.length = form.length;
    if (form.width) payload.width = form.width;
    if (form.height) payload.height = form.height;
    if (form.capacity) payload.capacity = form.capacity;
    if (form.compartments) payload.compartments = form.compartments;
    if (form.features) payload.features = form.features.split(",").map((s) => s.trim()).filter(Boolean);
    if (mrp) payload.mrp = mrp;

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
      setShowForm(false);
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

      {(showForm) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl rounded bg-paper p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">{editing ? "Edit Product" : "New Product"}</h2>
              <button type="button" onClick={() => { setEditing(false); setForm(emptyForm); setShowForm(false); }} className="text-sm underline">Close</button>
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
                MRP (₹)
                <input type="number" step="0.01" value={form.mrp} onChange={(e) => updateField("mrp", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Discount %
                <input type="number" step="1" min="0" max="100" value={form.discountPercent} onChange={(e) => updateField("discountPercent", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Selling Price (₹)
                <input type="number" step="0.01" value={form.sellingPrice} readOnly className="mt-1 w-full border border-ink/10 bg-cream px-3 py-2 text-sm" />
                <p className="text-xs text-ink-soft">Auto-calculated from MRP and discount.</p>
              </label>
              <label className="block text-sm">
                Stock (leave empty for unlimited)
                <input type="number" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Master Image *
                <input required value={form.masterImage} onChange={(e) => updateField("masterImage", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Product View 1
                <input value={form.sideImage1} onChange={(e) => updateField("sideImage1", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Product View 2
                <input value={form.sideImage2} onChange={(e) => updateField("sideImage2", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Product View 3
                <input value={form.sideImage3} onChange={(e) => updateField("sideImage3", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                Product View 4
                <input value={form.sideImage4} onChange={(e) => updateField("sideImage4", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
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
              <button type="button" onClick={() => { setEditing(false); setForm(emptyForm); setShowForm(false); }} className="text-sm underline">Cancel</button>
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
