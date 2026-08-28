import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact DANDY",
  description: `Contact ${site.contact.name} at DANDY in ${site.contact.location} — phone, email and WhatsApp for orders and wholesale enquiries.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact DANDY",
    description: `Contact ${site.contact.name} at DANDY in ${site.contact.location} — phone, email and WhatsApp for orders and wholesale enquiries.`,
    url: "/contact",
    siteName: "DANDY",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact DANDY",
    description: `Contact ${site.contact.name} at DANDY in ${site.contact.location}.`,
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
