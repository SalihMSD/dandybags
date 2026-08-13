import type { Metadata } from "next";

export const metadata: Metadata = { title: "Returns" };

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
      <h1 className="font-serif text-5xl">Returns</h1>
      <p className="mt-6 text-sm leading-relaxed text-ink-soft">
        Returns and exchange policy to be updated. Until then, write to us with your order details
        and we will advise case by case.
      </p>
    </div>
  );
}
