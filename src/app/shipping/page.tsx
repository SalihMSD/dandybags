import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping policy",
  description: "DANDY shipping policy — dispatch timelines, serviceable pincodes and delivery charges for Tamil Nadu.",
  alternates: { canonical: "/shipping" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Shipping</h1>
      <p className="mt-6 text-sm leading-relaxed text-ink-soft">
        Shipping policy to be updated. Dispatch timelines, serviceable pincodes and charges will be
        published before online checkout is enabled. For current orders, contact DANDY on phone or
        WhatsApp.
      </p>
    </div>
  );
}
