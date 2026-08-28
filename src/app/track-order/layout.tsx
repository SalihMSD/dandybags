import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track your DANDY order status, delivery updates and payment details using your phone number.",
  alternates: { canonical: "/track-order" },
  openGraph: {
    title: "Track Order — DANDY",
    description: "Track your DANDY order status, delivery updates and payment details using your phone number.",
    url: "/track-order",
    siteName: "DANDY",
  },
  twitter: {
    card: "summary_large_image",
    title: "Track Order — DANDY",
    description: "Track your DANDY order status, delivery updates and payment details using your phone number.",
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
