"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readCart, writeCart, type CartLine } from "@/lib/cart";
import { AssetImage } from "@/components/AssetImage";
import { formatInr } from "@/lib/format";
import { products } from "@/lib/products";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLines(readCart());
    void fetch("/api/customer/addresses", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { addresses: Address[] }) => {
        setAddresses(d.addresses || []);
        const def = d.addresses?.find((a) => a.isDefault) || d.addresses?.[0];
        if (def) setAddressId(def.id);
      });
  }, []);

  async function placeOrder() {
    setPending(true);
    setError("");
    const res = await fetch("/api/customer/checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    });
    const data = (await res.json()) as { error?: string; order?: { id: string } };
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    writeCart([]);
    router.push(`/checkout/confirmation?orderId=${data.order?.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">Checkout</h1>
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {lines.map((l) => {
          const p = products.find((x) => x.sku === l.sku);
          return (
            <li key={l.sku} className="flex items-center gap-4 p-4">
              <div className="relative aspect-[4/5] w-14 overflow-hidden bg-cream">
                <AssetImage src={l.image} alt={l.name} fill className="object-cover" sizes="56px" />
              </div>
              <div className="flex-1 text-sm">
                {l.name} × {l.qty}
              </div>
              <span className="text-sm">{formatInr(p?.sellingPrice ?? null)}</span>
            </li>
          );
        })}
      </ul>
      <h2 className="mt-10 font-serif text-2xl">Delivery address</h2>
      {addresses.length === 0 ? (
        <p className="mt-3 text-sm">
          Add an address in your account first, then return to checkout.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {addresses.map((a) => (
            <label key={a.id} className="flex gap-3 border border-ink/10 p-4 text-sm">
              <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
              <span>
                {a.fullName}, {a.line1}, {a.city} {a.pincode}
              </span>
            </label>
          ))}
        </div>
      )}
      {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}
      <button
        type="button"
        disabled={pending || !addressId || lines.length === 0}
        onClick={() => void placeOrder()}
        className="mt-8 h-12 bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
      >
        {pending ? "Placing order..." : "Place order"}
      </button>
    </div>
  );
}
