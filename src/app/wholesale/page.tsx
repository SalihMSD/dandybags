import type { Metadata } from "next";
import { B2BEnquiryForm } from "@/components/B2BEnquiryForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Wholesale & business partners",
  description: "Partner with DANDY for wholesale bags in Tamil Nadu — retailers, dealers, distributors and bulk buyers.",
  alternates: { canonical: "/wholesale" },
};

const audiences = [
  "Retailers",
  "Dealers",
  "Distributors",
  "Wholesalers",
  "Institutional buyers",
  "Organized retail",
  "Bulk buyers",
];

const benefits = [
  "Ready product range",
  "Own manufacturing capability",
  "Multiple bag categories",
  "Bulk supply capability",
  "Existing dealer network",
  "Established retail experience",
];

export default function WholesalePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16 md:px-8">
      <p className="text-[11px] tracking-[0.2em] uppercase">B2B</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Partner with DANDY</h1>
      <p className="mt-4 max-w-2xl text-base text-ink-soft sm:text-lg">
        Wholesale and business opportunities for retailers, dealers, distributors and bulk buyers.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {audiences.map((a) => (
          <p key={a} className="border border-ink/10 bg-cream px-4 py-3 text-sm">
            {a}
          </p>
        ))}
      </div>

      <h2 className="mt-14 font-serif text-3xl">Why partner</h2>
      <ul className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
        {benefits.map((b) => (
          <li key={b}>— {b}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-soft">
        Production volumes, dealer counts and partnership claims are shared privately during
        enquiry — not invented on this page.
      </p>

      <section className="mt-14 border border-ink/10 p-6 md:p-8">
        <h2 className="font-serif text-2xl">Organized retail</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          DANDY is expanding its presence across organized retail and is exploring partnerships
          with leading retail formats. Previously participated in a DMart Mega Vendor Event.
        </p>
      </section>

      <div className="mt-8">
        <Link href="/catalogue" className="text-[12px] tracking-[0.16em] uppercase underline">
          Download catalogue
        </Link>
      </div>

      <section id="enquiry" className="mt-16">
        <h2 className="font-serif text-3xl">Business enquiry</h2>
        <p className="mt-2 text-sm text-ink-soft">Wholesale prices are not shown on this website.</p>
        <div className="mt-8">
          <B2BEnquiryForm />
        </div>
      </section>
    </div>
  );
}
