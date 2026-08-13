import { type Product } from "./products";

export type CartLine = {
  sku: string;
  slug: string;
  name: string;
  qty: number;
  image: string;
};

const KEY = "dandy-cart";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("dandy-cart"));
}

export function addToCart(product: Product, qty = 1) {
  const lines = readCart();
  const i = lines.findIndex((l) => l.sku === product.sku);
  if (i >= 0) lines[i].qty += qty;
  else
    lines.push({
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      qty,
      image: product.images.front,
    });
  writeCart(lines);
}

export function setQty(sku: string, qty: number) {
  let lines = readCart();
  if (qty <= 0) lines = lines.filter((l) => l.sku !== sku);
  else lines = lines.map((l) => (l.sku === sku ? { ...l, qty } : l));
  writeCart(lines);
}

export function cartCount() {
  return readCart().reduce((n, l) => n + l.qty, 0);
}
