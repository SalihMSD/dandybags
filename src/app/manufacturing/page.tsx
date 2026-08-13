import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manufacturing",
  description: "DANDY manufacturing — product development, stitching, finishing, quality checking and packing in Tamil Nadu.",
};

const steps = [
  { title: "Manufacturing capability", body: "DANDY has own manufacturing capability for bags. Capacity figures will be shared privately with serious partners." },
  { title: "Product development", body: "Styles are developed for school, college, travel and everyday use. Process photographs to be added." },
  { title: "Stitching", body: "Stitching photographs to be added." },
  { title: "Finishing", body: "Finishing photographs to be added." },
  { title: "Quality checking", body: "Quality checking photographs to be added." },
  { title: "Packing", body: "Packing photographs to be added." },
  { title: "Bulk supply", body: "Built for wholesale and retail replenishment. Volumes discussed case by case." },
];

export default function ManufacturingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <h1 className="font-serif text-5xl">Manufacturing</h1>
      <p className="mt-4 text-ink-soft">
        Factory and process photographs will replace these notes when available. We will not use
        stock factory images.
      </p>
      <div className="mt-10 space-y-6">
        {steps.map((s) => (
          <section key={s.title} className="border-b border-ink/10 pb-6">
            <h2 className="font-serif text-2xl">{s.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
