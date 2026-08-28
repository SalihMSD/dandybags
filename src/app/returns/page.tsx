import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & exchanges",
  description: "DANDY returns and exchange policy — how to return or exchange bags purchased from DANDY.",
  alternates: { canonical: "/returns" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Returns</h1>
      <p className="mt-6 text-sm leading-relaxed text-ink-soft">
        Returns and exchange policy to be updated. Until then, write to us with your order details
        and we will advise case by case.
      </p>
    </div>
  );
}
