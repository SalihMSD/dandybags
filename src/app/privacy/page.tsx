import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "DANDY privacy policy — how we collect, use and protect your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Privacy policy</h1>
      <p className="mt-6 text-sm leading-relaxed text-ink-soft">
        We collect enquiry details you submit (name, company, phone, email, city) to respond to
        business and product requests. We do not sell this information. A fuller policy will be
        published before payment processing is enabled. Contact: dandybagsofficial@gmail.com
      </p>
    </div>
  );
}
