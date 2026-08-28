"use client";

import { useEffect, useState } from "react";
import { fieldClass } from "@/components/AuthShell";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  isDefault: boolean;
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await fetch("/api/customer/addresses", { credentials: "include" });
    const data = (await res.json()) as { addresses: Address[] };
    setAddresses(data.addresses || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/customer/addresses", {
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
        isDefault: form.get("isDefault") === "on",
      }),
    });
    setPending(false);
    e.currentTarget.reset();
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/customer/addresses/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  async function makeDefault(row: Address) {
    await fetch(`/api/customer/addresses/${row.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, isDefault: true }),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">My Addresses</h1>
      <ul className="mt-8 space-y-4">
        {addresses.map((a) => (
          <li key={a.id} className="border border-ink/10 p-4">
            <p className="font-serif text-xl">{a.fullName}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
              {a.city}, {a.state} {a.pincode}
            </p>
            <p className="text-sm">{a.phone}</p>
            <div className="mt-3 flex gap-4 text-xs uppercase tracking-[0.14em]">
              {a.isDefault ? <span>Default</span> : (
                <button type="button" onClick={() => void makeDefault(a)} className="underline">
                  Set default
                </button>
              )}
              <button type="button" onClick={() => void remove(a.id)} className="underline">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-12 grid gap-4 sm:grid-cols-2">
        <h2 className="font-serif text-2xl sm:col-span-2">Add address</h2>
        <input name="fullName" required placeholder="Full Name" className={fieldClass} />
        <input name="phone" required placeholder="Mobile Number" className={fieldClass} />
        <input name="line1" required placeholder="Address Line 1" className={`${fieldClass} sm:col-span-2`} />
        <input name="line2" placeholder="Address Line 2" className={`${fieldClass} sm:col-span-2`} />
        <input name="city" required placeholder="City" className={fieldClass} />
        <input name="state" required placeholder="State" className={fieldClass} />
        <input name="pincode" required placeholder="Pincode" className={fieldClass} />
        <input name="landmark" placeholder="Landmark (optional)" className={fieldClass} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input name="isDefault" type="checkbox" /> Set as default
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-12 bg-ink px-8 text-[12px] tracking-[0.18em] text-paper uppercase sm:col-span-2 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save address"}
        </button>
      </form>
    </div>
  );
}
