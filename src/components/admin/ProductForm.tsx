"use client";

import { useState, useEffect } from "react";
import { AssetImage } from "@/components/AssetImage";

const categories = [
  "school-bags",
  "college-bags",
  "backpacks",
  "travel-bags",
  "sling-bags",
  "handbags",
  "ladies-purses",
];

const imageSlots: { label: string; slot: string; formKey: keyof FormData; required?: boolean }[] = [
  { label: "Master Image", slot: "master", formKey: "imageFront", required: true },
  { label: "View 1", slot: "view-1", formKey: "imageBack" },
  { label: "View 2", slot: "view-2", formKey: "imageLeft" },
  { label: "View 3", slot: "view-3", formKey: "imageRight" },
  { label: "View 4", slot: "view-4", formKey: "imageTop" },
];

type FormData = {
  id?: string;
  name: string;
  sku: string;
  slug: string;
  category: string;
  subcategory: string;
  mrp: string;
  discountPercent: string;
  sellingPrice: string;
  stock: string;
  b2cAvailable: boolean;
  featured: boolean;
  imageFront: string;
  imageBack: string;
  imageLeft: string;
  imageRight: string;
  imageTop: string;
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
};

const emptyForm: FormData = {
  name: "",
  sku: "",
  slug: "",
  category: "school-bags",
  subcategory: "",
  mrp: "",
  discountPercent: "0",
  sellingPrice: "",
  stock: "",
  b2cAvailable: true,
  featured: false,
  imageFront: "",
  imageBack: "",
  imageLeft: "",
  imageRight: "",
  imageTop: "",
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
};

type Props = {
  productId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductForm({ productId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    void fetch(`/api/admin/products/${productId}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return;
        const { product } = await r.json();
        setForm({
          id: product.id,
          name: product.name,
          sku: product.sku,
          slug: product.slug,
          category: product.category,
          subcategory: product.subcategory,
          mrp: product.mrp ? Number(product.mrp).toString() : "",
          discountPercent: String(product.discountPercent || 0),
          sellingPrice: product.sellingPrice ? Number(product.sellingPrice).toString() : "",
          stock: product.stock !== null ? String(product.stock) : "",
          b2cAvailable: product.b2cAvailable,
          featured: product.featured,
          imageFront: product.imageFront || "",
          imageBack: product.imageBack || "",
          imageLeft: product.imageLeft || "",
          imageRight: product.imageRight || "",
          imageTop: product.imageTop || "",
          colour: product.colour || "",
          material: product.material || "",
          weight: product.weight || "",
          length: product.length || "",
          width: product.width || "",
          height: product.height || "",
          capacity: product.capacity || "",
          compartments: product.compartments || "",
          features: (product.features || []).join(", "),
          description: product.description || "",
          seoTitle: product.seoTitle || "",
          seoDescription: product.seoDescription || "",
        });
      });
  }, [productId]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mrp = form.mrp ? Number(form.mrp) : null;
  const discountPercent = form.discountPercent ? Number(form.discountPercent) : 0;
  const calculatedPrice =
    mrp !== null && discountPercent > 0
      ? String(Math.round((mrp * (1 - discountPercent / 100)) * 100) / 100)
      : form.sellingPrice;

  async function uploadImage(file: File, slot: string) {
    if (!form.id) return;
    setUploadingSlot(slot);
    const formData = new FormData();
    formData.append("productId", form.id);
    formData.append("slot", slot);
    formData.append("file", file);

    const res = await fetch("/api/admin/products/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = (await res.json()) as { url?: string; error?: string };
    setUploadingSlot(null);

    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  async function handleImageUpload(slot: string, formKey: keyof FormData) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = (input.files as FileList | null)?.[0];
      if (!file) return;

      try {
        const url = await uploadImage(file, slot);
        if (url) {
          updateField(formKey, url);
          await saveProduct();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    };
    input.click();
  }

  async function saveProduct() {
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      name: form.name,
      sku: form.sku,
      slug: form.slug,
      category: form.category,
      subcategory: form.subcategory,
      sellingPrice: calculatedPrice ? Number(calculatedPrice) : null,
      mrp: form.mrp ? Number(form.mrp) : null,
      stock: form.stock === "" ? null : Number(form.stock),
      b2cAvailable: form.b2cAvailable,
      featured: form.featured,
      imageFront: form.imageFront || "",
      description: form.description,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      discountPercent: discountPercent,
    };

    if (form.imageBack) payload.imageBack = form.imageBack;
    if (form.imageLeft) payload.imageLeft = form.imageLeft;
    if (form.imageRight) payload.imageRight = form.imageRight;
    if (form.imageTop) payload.imageTop = form.imageTop;
    if (form.colour) payload.colour = form.colour;
    if (form.material) payload.material = form.material;
    if (form.weight) payload.weight = form.weight;
    if (form.length) payload.length = form.length;
    if (form.width) payload.width = form.width;
    if (form.height) payload.height = form.height;
    if (form.capacity) payload.capacity = form.capacity;
    if (form.compartments) payload.compartments = form.compartments;
    if (form.features) payload.features = form.features.split(",").map((s) => s.trim()).filter(Boolean);

    const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
    const method = form.id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { product?: { id: string; imageFront: string; imageBack: string | null; imageLeft: string | null; imageRight: string | null; imageTop: string | null }; error?: string };
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to save product.");
      return;
    }

    if (data.product) {
      updateField("imageFront", data.product.imageFront);
      updateField("imageBack", data.product.imageBack || "");
      updateField("imageLeft", data.product.imageLeft || "");
      updateField("imageRight", data.product.imageRight || "");
      updateField("imageTop", data.product.imageTop || "");
    }

    onSaved();
  }

  const isNew = !form.id;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded bg-paper p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">{isNew ? "New Product" : "Edit Product"}</h2>
          <button onClick={onClose} className="text-sm underline">Close</button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}

        <form onSubmit={(e) => { e.preventDefault(); void saveProduct(); }} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Name *
              <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              SKU *
              <input required value={form.sku} onChange={(e) => updateField("sku", e.target.value)} className="mt-1 font-mono w-full border border-ink/10 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Slug *
              <input required value={form.slug} onChange={(e) => updateField("slug", e.target.value)} className="mt-1 font-mono w-full border border-ink/10 px-3 py-2 text-sm" />
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
              <input type="number" step="0.01" value={calculatedPrice} readOnly className="mt-1 w-full border border-ink/10 bg-cream px-3 py-2 text-sm" />
              <p className="text-xs text-ink-soft">Auto-calculated from MRP and discount.</p>
            </label>
            <label className="block text-sm">
              Stock (leave empty for unlimited)
              <input type="number" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
            </label>

            <div className="sm:col-span-2">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-soft">Product Images (5 slots)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {imageSlots.map((slot) => (
                  <div key={slot.slot} className="rounded border border-ink/10 bg-paper p-3">
                    <p className="text-xs uppercase tracking-[0.1em] text-ink-soft">
                      {slot.label} {slot.required && <span className="text-red-800">*</span>}
                    </p>
                    {form[slot.formKey as keyof FormData] ? (
                      <div className="mt-2">
                        <AssetImage src={form[slot.formKey as keyof FormData] as string} alt={slot.label} width={120} height={150} className="rounded object-cover" />
                        <button
                          type="button"
                          onClick={() => void handleImageUpload(slot.slot, slot.formKey)}
                          disabled={uploadingSlot === slot.slot || saving || !form.id}
                          className="mt-2 text-xs underline"
                        >
                          {uploadingSlot === slot.slot ? "Uploading…" : "Replace"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleImageUpload(slot.slot, slot.formKey)}
                        disabled={uploadingSlot === slot.slot || saving || !form.id}
                        className="mt-2 flex h-16 w-full cursor-pointer items-center justify-center border border-dashed border-ink/30 text-[10px] uppercase hover:border-ink hover:bg-cream"
                      >
                        {uploadingSlot === slot.slot ? "Uploading…" : "Upload"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!form.id ? <p className="mt-2 text-xs text-ink-soft">Save the product first to upload images.</p> : null}
            </div>

            <label className="block text-sm">Colour</label>
            <input value={form.colour} onChange={(e) => updateField("colour", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />

            <label className="block text-sm">Material</label>
            <input value={form.material} onChange={(e) => updateField("material", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />

            <label className="block text-sm">Weight</label>
            <input value={form.weight} onChange={(e) => updateField("weight", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />

            <label className="block text-sm">Length</label>
            <input value={form.length} onChange={(e) => updateField("length", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />

            <label className="block text-sm">Width</label>
            <input value={form.width} onChange={(e) => updateField("width", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />

            <label className="block text-sm">Height</label>
            <input value={form.height} onChange={(e) => updateField("height", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />

            <label className="block text-sm">Capacity</label>
            <input value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />

            <label className="block text-sm">Compartments</label>
            <input value={form.compartments} onChange={(e) => updateField("compartments", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
          </div>

          <label className="block text-sm">
            Features (comma-separated)
            <input value={form.features} onChange={(e) => updateField("features", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            Description
            <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            SEO Title
            <input value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            SEO Description
            <textarea value={form.seoDescription} onChange={(e) => updateField("seoDescription", e.target.value)} rows={2} className="mt-1 w-full border border-ink/10 px-3 py-2 text-sm" />
          </label>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.b2cAvailable} onChange={(e) => updateField("b2cAvailable", e.target.checked)} />
              B2C Available
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.featured} onChange={(e) => updateField("featured", e.target.checked)} />
              Featured
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-ink/10 pt-6">
            <button type="button" onClick={onClose} className="h-10 border border-ink px-5 text-[11px] tracking-[0.16em] uppercase hover:bg-ink/5">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="h-10 bg-ink px-5 text-[11px] tracking-[0.16em] uppercase text-paper disabled:opacity-60">
              {saving ? "Saving…" : isNew ? "Create Product" : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
