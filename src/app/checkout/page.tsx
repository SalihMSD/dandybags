"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readCart, writeCart, setQty, type CartLine } from "@/lib/cart";
import { AssetImage } from "@/components/AssetImage";
import { formatInr, discountPercent } from "@/lib/format";
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

type CartItem = {
  sku: string;
  slug: string;
  name: string;
  qty: number;
  image: string;
  sellingPrice: number;
  mrp: number | null;
  discountPercent: number;
  lineTotal: number;
  stock: number | null;
  b2cAvailable: boolean;
};

type CouponInfo = {
  code: string;
  type: string;
  value: number;
};

type AvailableCoupon = {
  code: string;
  discountType: string;
  discountValue: number;
  sourceBillAmount: number | null;
  rewardPercentage: number | null;
  expires: string;
};

type Quote = {
  ok: boolean;
  items: CartItem[];
  subtotal: number;
  discount: number;
  finalAmount: number;
  coupon: CouponInfo | null;
  availableCoupons: AvailableCoupon[] | null;
};

type PaymentSession = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
};

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
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [guest, setGuest] = useState<GuestForm>(emptyGuest);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [qtyUpdating, setQtyUpdating] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState("");

  const isGuestMode = !user && !loading;
  const hasCart = cartLines.length > 0;
  const hasValidQuoteItems = quote?.items && quote.items.length > 0;

  async function fetchQuote(items: { sku: string; qty: number }[], applyCoupon?: string) {
    const body: Record<string, unknown> = { items };
    if (applyCoupon) body.couponCode = applyCoupon;

    const res = await fetch("/api/customer/checkout/quote", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; error?: string } & Quote;
    if (!res.ok || !data.ok) {
      const serverError = data.error || "Unable to load prices. Please try again.";
      setQuoteError(serverError);
      setError("");
      setQuote(null);
    } else {
      setQuote(data);
      if (data.coupon) {
        setAppliedCouponCode(data.coupon.code);
      }
      setError("");
      setQuoteError("");
    }
  }

  useEffect(() => {
    const lines = readCart();
    setCartLines(lines);

    if (lines.length) {
      void fetchQuote(lines.map((l) => ({ sku: l.sku, qty: l.qty })));
    }

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
    if (!loading) {
      const params = new URLSearchParams(window.location.search);
      const coupon = params.get("coupon");
      if (coupon) {
        setCouponCode(coupon.toUpperCase());
        void applyCouponCode(coupon.toUpperCase());
      }
    }
  }, [loading]);

  async function updateQty(sku: string, qty: number) {
    setQtyUpdating(sku);
    setQty(sku, qty);
    const lines = readCart();
    setCartLines(lines);
    setQtyUpdating(null);

    if (quote) {
      await fetchQuote(lines.map((l) => ({ sku: l.sku, qty: l.qty })), appliedCouponCode || undefined);
    }
  }

  async function applyCouponCode(code: string) {
    if (!code.trim()) return;
    if (!hasCart) return;

    setCouponLoading(true);
    setCouponError("");

    // Clear any previously applied coupon
    setAppliedCouponCode(null);

    const lines = readCart();
    await fetchQuote(lines.map((l) => ({ sku: l.sku, qty: l.qty })), code.toUpperCase());

    setCouponLoading(false);
  }

  async function applyCoupon() {
    if (!couponCode) return;
    await applyCouponCode(couponCode);
  }

  function removeCoupon() {
    setAppliedCouponCode(null);
    setCouponCode("");
    setCouponError("");
    if (quote) {
      void fetchQuote(cartLines.map((l) => ({ sku: l.sku, qty: l.qty })));
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
    const newAddr = (data.addresses || []).find(
      (a) =>
        a.fullName === String(form.get("fullName"))?.trim() &&
        a.line1 === String(form.get("line1"))?.trim() &&
        a.city === String(form.get("city"))?.trim() &&
        a.pincode === String(form.get("pincode"))?.trim()
    );
    if (newAddr) setAddressId(newAddr.id);
    setShowAddressForm(false);
    setPending(false);
  }

  async function pay() {
    if (!hasCart || !quote) return;
    setPending(true);
    setError("");

    if (isGuestMode && !guest.fullName) {
      setPending(false);
      setError("Please enter your delivery details.");
      return;
    }
    if (!isGuestMode && !addressId) {
      setPending(false);
      setError("Please select a delivery address.");
      return;
    }

    try {
      let res: Response;
      if (user) {
        res = await fetch("/api/customer/payments/create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addressId, couponCode: appliedCouponCode || undefined }),
        });
      } else {
        res = await fetch("/api/customer/payments/create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestDetails: guest,
            items: cartLines.map((l) => ({ sku: l.sku, qty: l.qty })),
            couponCode: appliedCouponCode || undefined,
          }),
        });
      }

      const data = (await res.json()) as PaymentSession & { error?: string };
      if (!res.ok) {
        setPending(false);
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      await openRazorpay(data);
    } catch (e) {
      setPending(false);
      setError("Something went wrong. Please try again.");
    }
  }

  async function openRazorpay(data: PaymentSession) {
    const Razorpay = (window as Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
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
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
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
            setCartLines([]);
            setQuote(null);
            router.push(`/checkout/confirmation?orderId=${verified.orderId || data.orderId}`);
          })();
        },
      });
      checkout.open();
    } catch {
      setPending(false);
      setError("Payment could not be started. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
        <h1 className="font-serif text-4xl">Checkout</h1>
        <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  if (!hasCart) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
        <h1 className="font-serif text-4xl">Checkout</h1>
        <div className="mt-8 rounded border border-ink/10 bg-paper p-6 sm:p-8 text-center">
          <p className="text-sm text-ink-soft">Your cart is empty.</p>
          <Link href="/shop" className="mt-4 inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <h1 className="font-serif text-4xl">Checkout</h1>

      {error ? <p className="mt-6 text-sm text-red-800">{error}</p> : null}
      {quoteError ? <p className="mt-6 text-sm text-red-800">{quoteError}</p> : null}

      {/* Order Items */}
      <section className="mt-8">
        <h2 className="font-serif text-xl">Order Items</h2>
        <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
          {cartLines.map((line) => {
            const item = quote?.items.find((i) => i.sku === line.sku);
            const itemQuote = item || {
              sku: line.sku,
              slug: line.slug,
              name: line.name,
              qty: line.qty,
              image: line.image,
              sellingPrice: line.sellingPrice,
              mrp: null,
              discountPercent: 0,
              lineTotal: line.sellingPrice * line.qty,
              stock: null,
              b2cAvailable: true,
            };

            const dp = discountPercent(itemQuote.mrp, itemQuote.sellingPrice);
            const isUpdating = qtyUpdating === line.sku;
            const lineTotal = itemQuote.sellingPrice * itemQuote.qty;
            const unitPrice = itemQuote.sellingPrice > 0 ? formatInr(itemQuote.sellingPrice) : "—";

            return (
              <li key={line.sku} className="flex items-center gap-4 p-3 sm:gap-6 sm:p-4">
                <div className="relative aspect-[4/5] w-16 flex-none overflow-hidden bg-cream sm:w-20">
                  <AssetImage src={itemQuote.image} alt={itemQuote.name} fill className="object-cover object-center" sizes="80px" />
                </div>
                <div className="flex-1">
                  <p className="font-serif text-sm sm:text-base">{itemQuote.name}</p>
                  {itemQuote.mrp && itemQuote.mrp > itemQuote.sellingPrice ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft sm:text-sm">
                      <span className="line-through">MRP: {formatInr(itemQuote.mrp)}</span>
                      <span className="rounded bg-cream px-1.5 py-0.5 text-[10px] font-medium text-green-800">{dp ?? 0}% OFF</span>
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-ink-soft sm:text-sm">
                    Unit Price: {unitPrice}
                  </div>
                  <div className="mt-1 text-right text-xs font-medium sm:text-sm">
                    Line Total: {formatInr(lineTotal)}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex w-24 flex-col items-center gap-1">
                  <label className="text-xs uppercase tracking-[0.1em] text-ink-soft">Qty</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQty(line.sku, Math.max(1, line.qty - 1))}
                      disabled={isUpdating || (quote ? false : itemQuote.stock === 1)}
                      className="h-7 w-7 rounded border border-ink/20 text-base leading-none hover:bg-ink/5 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="text-sm w-6 text-center">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(line.sku, line.qty + 1)}
                      disabled={isUpdating || (quote ? itemQuote.stock !== null && line.qty >= itemQuote.stock : false)}
                      className="h-7 w-7 rounded border border-ink/20 text-base leading-none hover:bg-ink/5 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  {isUpdating ? <span className="text-[10px] text-ink-soft">Updating…</span> : null}
                  {!isUpdating && itemQuote.stock !== null && itemQuote.stock <= 0 && itemQuote.b2cAvailable === false ? (
                    <span className="text-[10px] text-red-800">Out of stock</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Price Loading State */}
        {!quote && (
          <div className="mt-4 text-sm text-ink-soft">Loading prices…</div>
        )}
      </section>

      {/* Coupon Section */}
      {quote && (
        <section className="mt-8 rounded border border-ink/10 bg-paper p-4 sm:p-6">
          <h2 className="font-serif text-xl">Coupon</h2>

          {quote.coupon ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm">
                  <span className="font-medium">{quote.coupon.code}</span>
                  {quote.coupon.type === "FIXED"
                    ? ` — ₹${quote.coupon.value} OFF`
                    : ` — ${quote.coupon.value}% OFF`}
                </p>
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
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponCode}
                  className="h-12 bg-ink px-6 text-[12px] tracking-[0.2em] text-paper uppercase disabled:opacity-60"
                >
                  {couponLoading ? "Applying…" : "Apply"}
                </button>
              </div>

              {/* Select from My Coupons (for authenticated users with available coupons) */}
              {quote.availableCoupons && quote.availableCoupons.length > 0 ? (
                <div className="mt-3">
                  <label className="text-xs uppercase tracking-[0.16em] text-ink-soft">Or select from your coupons:</label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {quote.availableCoupons.map((c) => {
                      const isExpired = new Date(c.expires) < new Date();
                      const label =
                        c.discountType === "FIXED"
                          ? `₹${c.discountValue} OFF`
                          : `${c.discountValue}% OFF`;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCouponCode(c.code);
                            void applyCouponCode(c.code);
                          }}
                          disabled={couponLoading || isExpired}
                          className="flex flex-col items-start rounded border border-ink/10 p-3 text-left hover:border-ink hover:bg-cream disabled:opacity-60"
                        >
                          <span className="font-medium text-sm">{c.code}</span>
                          <span className="text-xs text-ink-soft">{label}</span>
                          {c.rewardPercentage != null && (
                            <span className="text-xs text-ink-soft">Share & Earn reward: {c.rewardPercentage}%</span>
                          )}
                          {isExpired && <span className="text-xs text-red-600">Expired</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {couponError ? <p className="mt-2 text-sm text-red-800">{couponError}</p> : null}
        </section>
      )}

      {/* Price Summary */}
      {hasValidQuoteItems && (
        <section className="mt-8 rounded border border-ink/10 bg-paper p-4 sm:p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatInr(quote!.subtotal)}</span>
            </div>
            {quote!.coupon && quote!.discount > 0 ? (
              <div className="flex justify-between text-green-800">
                <span>Coupon discount ({quote!.coupon.code})</span>
                <span>-{formatInr(quote!.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-medium">
              <span>Final Total</span>
              <span>{formatInr(quote!.finalAmount)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Delivery Address */}
      {quote && hasCart && (
        <section className="mt-8">
          <h2 className="font-serif text-xl">Delivery address</h2>

          {showAddressForm ? (
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
                <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60">
                  {pending ? "Saving…" : "Save address"}
                </button>
                <button type="button" onClick={() => setShowAddressForm(false)} className="inline-flex h-12 items-center justify-center border border-ink px-8 text-[12px] tracking-[0.2em] uppercase hover:bg-cream">
                  Cancel
                </button>
              </div>
              {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}
            </form>
          ) : isGuestMode ? (
            <div className="mt-4 rounded border border-ink/10 bg-paper p-4 sm:p-6">
              <p className="text-sm text-ink-soft">Enter your delivery details below. No account required.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(["fullName", "email", "phone", "line1", "line2", "city", "state", "pincode", "landmark"] as const).map((field) => (
                  <label key={field} className={`block text-sm ${field === "fullName" || field === "email" || field === "line1" || field === "line2" ? "sm:col-span-2" : ""}`}>
                    {field.charAt(0).toUpperCase() + field.slice(1)} *
                    <input
                      required={["fullName", "email", "phone", "line1", "city", "state", "pincode"].includes(field)}
                      type={field === "email" ? "email" : field === "phone" || field === "pincode" ? "tel" : "text"}
                      value={guest[field]}
                      onChange={(e) => setGuest((g) => ({ ...g, [field]: e.target.value }))}
                      className="mt-1 w-full border border-ink/15 bg-paper px-4 py-3 text-base outline-none focus:border-ink"
                      placeholder={
                        field === "email" ? "you@example.com"
                          : field === "phone" ? "10-digit mobile"
                          : field === "pincode" ? "6-digit pincode"
                          : field.charAt(0).toUpperCase() + field.slice(1)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : !loading && addresses.length === 0 ? (
            <div className="mt-4 rounded border border-ink/10 bg-paper p-6 text-center">
              <p className="text-sm text-ink-soft">You do not have any saved addresses yet.</p>
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className="mt-4 inline-flex h-12 items-center justify-center bg-camel px-8 text-[12px] tracking-[0.2em] text-ink uppercase"
              >
                Add Address
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {addresses.map((a) => (
                <label key={a.id} className="flex gap-3 border border-ink/10 p-4 text-sm">
                  <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  <span>
                    <span className="font-medium">{a.fullName}</span>
                    <span className="text-ink-soft">
                      {", "}{a.line1}, {a.city} {a.pincode}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {!isGuestMode && !showAddressForm && addresses.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddressForm(true)}
              className="mt-4 text-xs underline"
            >
              + Add another address
            </button>
          )}
        </section>
      )}

      {/* Pay Button */}
      {hasValidQuoteItems && hasCart && (
        <div className="mt-8">
          <button
            type="button"
            disabled={pending || (quote!.finalAmount <= 0) || !!quoteError}
            onClick={() => void pay()}
            className="w-full h-14 bg-camel text-[12px] tracking-[0.2em] text-ink uppercase sm:w-auto disabled:opacity-60"
          >
            {pending ? "Processing…" : `PAY ${formatInr(quote!.finalAmount)}`}
          </button>
        </div>
      )}

      {isGuestMode && (
                <p className="mt-4 text-xs text-ink-soft">
                  Checkout without creating an account. You can log in or register after placing your order to track it.
                </p>
      )}
    </div>
  );
}
