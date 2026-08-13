"use client";

import { B2BEnquiryForm } from "@/components/B2BEnquiryForm";
import { site } from "@/lib/site";
import { generalWhatsappUrl } from "@/lib/whatsapp";

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:gap-12 sm:py-16 md:grid-cols-2 md:px-8">
      <div>
        <h1 className="font-serif text-4xl sm:text-5xl">Contact</h1>
        <p className="mt-4 text-ink-soft">
          {site.contact.name}
          <br />
          {site.contact.location}
        </p>
        <p className="mt-6 text-sm">
          Phone{" "}
          <a className="underline" href={`tel:+91${site.contact.phone}`}>
            {site.contact.phoneDisplay}
          </a>
        </p>
        <p className="text-sm">
          Email{" "}
          <a className="underline" href={`mailto:${site.contact.email}`}>
            {site.contact.email}
          </a>
        </p>
        <p className="mt-4 text-xs text-ink-soft">GSTIN {site.contact.gstin}</p>
        <a
          href={generalWhatsappUrl()}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block bg-ink px-6 py-3 text-[11px] tracking-[0.16em] text-paper uppercase"
        >
          WhatsApp
        </a>
      </div>
      <div>
        <h2 className="font-serif text-3xl">Write to us</h2>
        <p className="mt-2 text-sm text-ink-soft">For wholesale, use the full business form below.</p>
        <div className="mt-6">
          <B2BEnquiryForm />
        </div>
      </div>
    </div>
  );
}
