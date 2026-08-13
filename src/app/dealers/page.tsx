import type { Metadata } from "next";
import Link from "next/link";
import { dealers } from "@/lib/products";

export const metadata: Metadata = {
  title: "Dealer network",
  description: "DANDY dealer and retail partners. Listings are published only with permission.",
};

export default function DealersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <h1 className="font-serif text-5xl">Our dealer network</h1>
      <p className="mt-4 text-ink-soft">
        Trusted by retail partners across locations we will publish here. Dealer names, cities and
        logos appear only when confirmed.
      </p>
      {dealers.length === 0 ? (
        <p className="mt-10 border border-ink/10 bg-cream p-8 text-sm">
          Dealer listings to be updated. If you already work with DANDY and wish to be shown here,
          write to us from the{" "}
          <Link href="/wholesale" className="underline">
            wholesale
          </Link>{" "}
          page.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-ink/10 border border-ink/10">
          {dealers.map((d) => (
            <li key={`${d.name}-${d.city}`} className="p-4">
              <p className="font-serif text-xl">{d.name}</p>
              <p className="text-sm text-ink-soft">
                {d.city}, {d.district}, {d.state}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/wholesale#enquiry"
        className="mt-10 inline-block bg-ink px-6 py-3 text-[11px] tracking-[0.16em] text-paper uppercase"
      >
        Become a dealer
      </Link>
    </div>
  );
}
