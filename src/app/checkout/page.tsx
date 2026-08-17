"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
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

type PaymentSession = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
};

type RazorpayCheckout = {
  open: () => void;
};

type RazorpayCtor = new (options: {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
}) => RazorpayCheckout;

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

  async function pay() {
    setPending(true);
    setError("");
    const res = await fetch("/api/customer/payments/create", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    });
    const data = (await res.json()) as PaymentSession & { error?: string };
    if (!res.ok) {
      setPending(false);
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }

    const Razorpay = (window as Window & { Razorpay?: RazorpayCtor }).Razorpay;
    if (!Razorpay) {
      setPending(false);
      setError("Payment could not be started. Please try again.");
      return;
    }

    const checkout = new Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.razorpayOrderId,
      name: "DANDY",
      handler: (response) => {
        void (async () => {
          const verify = await fetch("/api/customer/payments/verify", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verified = (await verify.json()) as { error?: string; orderId?: string };
          setPending(false);
          if (!verify.ok) {
            setError(verified.error || "Payment could not be verified.");
            return;
          }
          writeCart([]);
          router.push(`/checkout/confirmation?orderId=${verified.orderId || data.orderId}`);
        })();
      },
    });
    checkout.open();
    setPending(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
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
        onClick={() => void pay()}
        className="mt-8 h-12 bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
      >
        {pending ? "Starting payment..." : "Pay"}
      </button>
    </div>
  );
}
