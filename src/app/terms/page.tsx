import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Terms</h1>
      <p className="mt-6 text-sm leading-relaxed text-ink-soft">
        Website content is for information and enquiry. Product specifications and prices marked “to
        be updated” are not offers. Full terms of sale will be issued with checkout. DANDY operates
        from Karur, Tamil Nadu.
      </p>
    </div>
  );
}
