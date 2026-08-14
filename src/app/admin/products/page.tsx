import Link from "next/link";
import { products } from "@/lib/products";

export default function AdminProducts() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link href="/admin" className="text-xs uppercase tracking-[0.16em] underline">
        Admin
      </Link>
      <h1 className="mt-4 font-serif text-4xl">Products</h1>
      <p className="mt-3 text-sm text-ink-soft">Catalogue currently lives in the site product list. Inventory fields can be attached later.</p>
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {products.map((p) => (
          <li key={p.sku} className="flex justify-between p-4 text-sm">
            <span>{p.name}</span>
            <span className="text-ink-soft">{p.sku}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
