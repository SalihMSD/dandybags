"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { readCart, writeCart, type CartLine } from "@/lib/cart";
import { AssetImage } from "@/components/AssetImage";
import { formatInr } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

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

type GuestForm = {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
};

const emptyGuest: GuestForm = {
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [guest, setGuest] = useState<GuestForm>(emptyGuest);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; finalAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [cartReady, setCartReady] = useState(false);

  const subtotal = lines.reduce((sum, l) => sum + (l.sellingPrice || 0) * l.qty, 0);
  const discount = appliedCoupon?.discount || 0;
  const finalTotal = Math.max(0, subtotal - discount);

  useEffect(() => {
    setLines(readCart());
    setCartReady(true);
    if (user) {
      void fetch("/api/customer/addresses", { credentials: "include" })
        .then((r) => r.json())
        .then((d: { addresses: Address[] }) => {
          setAddresses(d.addresses || []);
          const def = d.addresses?.find((a) => a.isDefault) || d.addresses?.[0];
          if (def) setAddressId(def.id);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!cartReady) return;
    const params = new URLSearchParams(window.location.search);
    const coupon = params.get("coupon");
    if (coupon) {
      setCouponCode(coupon.toUpperCase());
      void applyCouponCode(coupon.toUpperCase());
    }
  }, [cartReady]);

  async function applyCouponCode(code: string) {
    setCouponLoading(true);
    setCouponError("");
    try {
      const subtotal = lines.reduce((sum, l) => sum + (l.sellingPrice || 0) * l.qty, 0);
      if (subtotal <= 0) {
        setCouponError("Your cart is empty.");
        setAppliedCoupon(null);
        return;
      }
      const res = await fetch("/api/customer/coupons/validate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderTotal: subtotal }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; coupon?: { code: string; discount: number; finalAmount: number }; discount?: number; finalAmount?: number };
      if (!res.ok || !data.ok) {
        setCouponError(data.error || "Invalid coupon.");
        setAppliedCoupon(null);
        return;
      }
      if (data.coupon) {
        setAppliedCoupon({ code: data.coupon.code, discount: data.discount ?? 0, finalAmount: data.finalAmount ?? 0 });
        setCouponCode(data.coupon.code);
      }
    } catch {
      setCouponError("Something went wrong. Please try again.");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  }

  async function addAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/customer/addresses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        phone: form.get("phone"),
        line1: form.get("line1"),
        line2: form.get("line2"),
        city: form.get("city"),
        state: form.get("state"),
        pincode: form.get("pincode"),
        landmark: form.get("landmark"),
        isDefault: true,
      }),
    });
    const data = (await res.json()) as { addresses?: Address[]; error?: string };
    if (!res.ok) {
      setError(data.error || "Failed to save address.");
      setPending(false);
      return;
    }
    setAddresses(data.addresses || []);
    const newAddr = data.addresses?.[0];
    if (newAddr) setAddressId(newAddr.id);
    setShowAddressForm(false);
    setPending(false);
  }

  async function applyCoupon() {
    if (!couponCode) return;
    await applyCouponCode(couponCode);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  }

  async function pay() {
    setPending(true);
    setError("");

    if (user) {
      if (!addressId) {
        setPending(false);
        setError("Please select a delivery address.");
        return;
      }
      const res = await fetch("/api/customer/payments/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, couponCode: appliedCoupon?.code }),
      });
      const data = (await res.json()) as PaymentSession & { error?: string };
      if (!res.ok) {
        setPending(false);
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      await openRazorpay(data);
      return;
    }

    const guestDetails = {
      fullName: guest.fullName.trim(),
      email: guest.email.trim(),
      phone: guest.phone.trim(),
      line1: guest.line1.trim(),
      line2: guest.line2.trim(),
      city: guest.city.trim(),
      state: guest.state.trim(),
      pincode: guest.pincode.trim(),
      landmark: guest.landmark.trim(),
    };

    const res = await fetch("/api/customer/payments/create", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestDetails,
        items: lines.map((l) => ({ sku: l.sku, qty: l.qty })),
        couponCode: appliedCoupon?.code,
      }),
    });
    const data = (await res.json()) as PaymentSession & { error?: string };
    if (!res.ok) {
      setPending(false);
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    await openRazorpay(data);
  }

  async function openRazorpay(data: PaymentSession) {
    const Razorpay = (window as Window & { Razorpay?: RazorpayCtor }).Razorpay;
    if (!Razorpay) {
      setPending(false);
      setError("Payment could not be started. Please try again.");
      return;
    }

    try {
      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: "DANDY",
        handler: (response) => {
          void (async () => {
            const verifyUrl = user ? "/api/customer/payments/verify" : "/api/guest/payments/verify";
            const verify = await fetch(verifyUrl, {
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
    } catch (e) {
      setPending(false);
      setError("Payment could not be started. Please try again.");
    }
  }

  const isGuest = !user && !loading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <h1 className="font-serif text-4xl">Checkout</h1>
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10">
        {lines.map((l) => (
          <li key={l.sku} className="flex items-center gap-4 p-4">
            <div className="relative aspect-[4/5] w-14 overflow-hidden bg-cream">
              <AssetImage src={l.image} alt={l.name} fill className="object-cover object-center" sizes="56px" />
            </div>
            <div className="flex-1 text-sm">
              {l.name} × {l.qty}
            </div>
            <span className="text-sm">{formatInr(l.sellingPrice)}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-serif text-2xl">Delivery address</h2>
      {isGuest ? (
        <div className="mt-4 rounded border border-ink/10 bg-paper p-4 sm:p-6">
          <p className="text-sm text-ink-soft">
            Enter your delivery details below. No account required.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Full name *
              <input
                required
                value={guest.fullName}
                onChange={(e) => setGuest((g) => ({ ...g, fullName: e.target.value }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="Your full name"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Email *
              <input
                required
                type="email"
                value={guest.email}
                onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm">
              Mobile number *
              <input
                required
                value={guest.phone}
                onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="10-digit mobile"
              />
            </label>
            <label className="block text-sm">
              Pincode *
              <input
                required
                value={guest.pincode}
                onChange={(e) => setGuest((g) => ({ ...g, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="6-digit pincode"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Address line 1 *
              <input
                required
                value={guest.line1}
                onChange={(e) => setGuest((g) => ({ ...g, line1: e.target.value }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="House no., building, street"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Address line 2
              <input
                value={guest.line2}
                onChange={(e) => setGuest((g) => ({ ...g, line2: e.target.value }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="Area, locality (optional)"
              />
            </label>
            <label className="block text-sm">
              City *
              <input
                required
                value={guest.city}
                onChange={(e) => setGuest((g) => ({ ...g, city: e.target.value }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="City"
              />
            </label>
            <label className="block text-sm">
              State *
              <input
                required
                value={guest.state}
                onChange={(e) => setGuest((g) => ({ ...g, state: e.target.value }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="State"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Landmark
              <input
                value={guest.landmark}
                onChange={(e) => setGuest((g) => ({ ...g, landmark: e.target.value }))}
                className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                placeholder="Near..."
              />
            </label>
          </div>
        </div>
      ) : !loading && addresses.length === 0 && !showAddressForm ? (
        <div className="mt-4 rounded border border-ink/10 bg-paper p-6 text-center">
          <p className="text-sm text-ink-soft">You don't have any saved addresses yet.</p>
          <button
            type="button"
            onClick={() => setShowAddressForm(true)}
            className="mt-4 h-12 bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase"
          >
            Add Address
          </button>
        </div>
      ) : showAddressForm ? (
        <form onSubmit={addAddress} className="mt-4 rounded border border-ink/10 bg-paper p-4 sm:p-6">
          <p className="text-sm text-ink-soft">Add a delivery address for this order.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Full name *
              <input name="fullName" required className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="Your full name" />
            </label>
            <label className="block text-sm">
              Mobile number *
              <input name="phone" required className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="10-digit mobile" />
            </label>
            <label className="block text-sm">
              Pincode *
              <input name="pincode" required className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="6-digit pincode" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Address line 1 *
              <input name="line1" required className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="House no., building, street" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Address line 2
              <input name="line2" className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="Area, locality (optional)" />
            </label>
            <label className="block text-sm">
              City *
              <input name="city" required className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="City" />
            </label>
            <label className="block text-sm">
              State *
              <input name="state" required className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="State" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Landmark
              <input name="landmark" className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink" placeholder="Near..." />
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={pending} className="h-12 bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60">
              {pending ? "Saving..." : "Save address"}
            </button>
            <button type="button" onClick={() => setShowAddressForm(false)} className="h-12 border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream">
              Cancel
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}
        </form>
      ) : !loading && addresses.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">Add an address in your account first, then return to checkout.</p>
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

      <div className="mt-8 border-t border-ink/10 pt-6">
        <h2 className="font-serif text-xl">Coupon</h2>
        {appliedCoupon ? (
          <div className="mt-4 flex items-center justify-between rounded border border-camel bg-camel/10 p-4">
            <div>
              <p className="text-sm font-medium">{appliedCoupon.code}</p>
              <p className="text-xs text-ink-soft">Discount: -{formatInr(appliedCoupon.discount)}</p>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="text-xs text-red-800 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="flex-1 border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={couponLoading || !couponCode}
              className="h-12 bg-ink px-6 text-[12px] tracking-[0.2em] text-paper uppercase disabled:opacity-60"
            >
              {couponLoading ? "Applying..." : "Apply"}
            </button>
          </div>
        )}
        {couponError && <p className="mt-2 text-sm text-red-800">{couponError}</p>}
      </div>

      <div className="mt-8 space-y-2 border-t border-ink/10 pt-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatInr(subtotal)}</span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-green-800">
            <span>Coupon discount ({appliedCoupon.code})</span>
            <span>-{formatInr(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-medium">
          <span>Total</span>
          <span>{formatInr(finalTotal)}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={pending || lines.length === 0}
        onClick={() => void pay()}
        className="mt-8 h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Starting payment..." : `Pay ${formatInr(finalTotal)}`}
      </button>
      {isGuest && (
        <p className="mt-4 text-xs text-ink-soft">
          Checkout without creating an account. You can log in or register after placing your order to track it.
        </p>
      )}
    </div>
  );
}
