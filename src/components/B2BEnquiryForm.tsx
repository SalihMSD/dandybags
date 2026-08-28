"use client";

import { useState } from "react";
import { wholesaleWhatsappUrl } from "@/lib/whatsapp";

const types = [
  "Retailer",
  "Dealer",
  "Distributor",
  "Wholesaler",
  "Institutional Buyer",
  "Organized Retail",
  "Other",
];

const productOptions = [
  "School Bags",
  "College Bags",
  "Backpacks",
  "Travel Bags",
  "Sling Bags",
  "Handbags",
  "Ladies Purses",
];

export function B2BEnquiryForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = [
      "DANDY business enquiry",
      ...["name", "company", "phone", "email", "city", "state", "businessType", "products", "quantity", "message"].map(
        (k) => `${k}: ${String(data.get(k) || "")}`,
      ),
    ].join("\n");
    window.location.href = `mailto:dandybagsofficial@gmail.com?subject=${encodeURIComponent("DANDY business enquiry")}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  if (sent) {
    return (
      <p className="border border-ink/10 bg-cream p-6 text-sm">
        Thank you. Your enquiry is ready to send by email. You can also reach us on WhatsApp.
      </p>
    );
  }

  const field = "w-full min-h-11 border border-ink/15 bg-paper px-3 py-2.5 text-base outline-none focus:border-ink md:text-sm";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="text-xs tracking-wide uppercase">
        Name
        <input required name="name" className={`${field} mt-1`} />
      </label>
      <label className="text-xs tracking-wide uppercase">
        Company Name
        <input required name="company" className={`${field} mt-1`} />
      </label>
      <label className="text-xs tracking-wide uppercase">
        Phone
        <input required name="phone" className={`${field} mt-1`} />
      </label>
      <label className="text-xs tracking-wide uppercase">
        Email
        <input required type="email" name="email" className={`${field} mt-1`} />
      </label>
      <label className="text-xs tracking-wide uppercase">
        City
        <input required name="city" className={`${field} mt-1`} />
      </label>
      <label className="text-xs tracking-wide uppercase">
        State
        <input required name="state" className={`${field} mt-1`} />
      </label>
      <label className="text-xs tracking-wide uppercase">
        Business Type
        <select name="businessType" className={`${field} mt-1`}>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="text-xs tracking-wide uppercase">
        Products Interested In
        <select name="products" className={`${field} mt-1`}>
          {productOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="text-xs tracking-wide uppercase md:col-span-2">
        Approximate Quantity
        <input name="quantity" className={`${field} mt-1`} />
      </label>
      <label className="text-xs tracking-wide uppercase md:col-span-2">
        Message
        <textarea name="message" rows={4} className={`${field} mt-1`} />
      </label>
      <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:flex-wrap">
        <button type="submit" className="min-h-12 bg-ink px-6 py-3 text-[11px] tracking-[0.16em] text-paper uppercase">
          Submit business enquiry
        </button>
        <a
          href={wholesaleWhatsappUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center justify-center border border-ink px-6 py-3 text-[11px] tracking-[0.16em] uppercase"
        >
          Contact on WhatsApp
        </a>
      </div>
    </form>
  );
}
