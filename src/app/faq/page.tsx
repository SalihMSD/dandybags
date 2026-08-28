import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about DANDY bags — what we sell, where we are based, wholesale and retail.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    q: "What does DANDY sell?",
    a: "Bags only: school, college, backpacks, travel, sling, handbags and ladies purses.",
  },
  {
    q: "Where are you based?",
    a: "Karur, Tamil Nadu – 639002. The business was originally based in Erode.",
  },
  {
    q: "Can I buy online?",
    a: "You can browse and enquire now. Cart checkout and payment will be enabled in a later phase.",
  },
  {
    q: "Do you supply wholesale?",
    a: "Yes. Use the wholesale page for a business enquiry. Wholesale prices are not shown publicly.",
  },
  {
    q: "Are you a DMart or Reliance vendor?",
    a: "We previously participated in a DMart Mega Vendor Event and are exploring organized retail. We do not claim current approved-vendor status on this site.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">FAQ</h1>
      <div className="mt-10 space-y-8">
        {faqs.map((f) => (
          <section key={f.q}>
            <h2 className="font-serif text-2xl">{f.q}</h2>
            <p className="mt-2 text-sm text-ink-soft">{f.a}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
