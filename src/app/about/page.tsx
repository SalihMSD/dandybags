import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About DANDY",
  description: "DANDY is a bag brand in Karur, Tamil Nadu — originally based in Erode — offering school, college, travel and everyday bags.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <p className="text-[11px] tracking-[0.2em] uppercase">Company</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">About DANDY</h1>
      <div className="mt-10 space-y-10 leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-serif text-2xl text-ink">Who we are</h2>
          <p className="mt-3">
            DANDY is a focused bag brand. We make and sell bags for school, college, travel and
            everyday lifestyle — not a general merchandise store.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-ink">Our journey</h2>
          <p className="mt-3">
            Originally based in Erode, the business now operates from Karur, Tamil Nadu. We bring
            existing retail experience, inventory, and relationships with dealers and customers into
            this next chapter.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-ink">Our products</h2>
          <p className="mt-3">
            School bags, college bags, backpacks, travel bags, sling bags, handbags and ladies
            purses. Each piece will be photographed and specified before it is published as a
            finished listing.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-ink">Our manufacturing</h2>
          <p className="mt-3">
            DANDY has own manufacturing capability — product development, stitching, finishing,
            quality checking and packing. Photographs of the process will be added on the{" "}
            <Link href="/manufacturing" className="text-ink underline">
              manufacturing
            </Link>{" "}
            page.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-ink">Our retail experience</h2>
          <p className="mt-3">
            We operate as a bag retailer and wholesaler. DANDY previously participated in a DMart
            Mega Vendor Event and is exploring partnerships with organized retail formats. We do not
            claim current approved-vendor status unless it is formally confirmed.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-ink">Our dealer network</h2>
          <p className="mt-3">
            We work with dealers and retailers. Named partners will be listed only with permission —
            see{" "}
            <Link href="/dealers" className="text-ink underline">
              dealer network
            </Link>
            .
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-ink">Our vision</h2>
          <p className="mt-3">
            {site.description} Bags for every journey — sold with care, specified with accuracy, and
            supplied with reliability.
          </p>
        </section>
      </div>
    </div>
  );
}
