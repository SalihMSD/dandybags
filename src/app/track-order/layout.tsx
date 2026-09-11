import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track Order",
  robots: { index: false, follow: true },
  description: "Track your DANDY order using your order ID and phone number.",
  alternates: { canonical: "/track-order" },
  openGraph: {
    title: "Track Order — DANDY",
    description: "Track your DANDY order using your order ID and phone number.",
    url: "/track-order",
    siteName: "DANDY",
  },
  twitter: {
    card: "summary_large_image",
    title: "Track Order — DANDY",
    description: "Track your DANDY order using your order ID and phone number.",
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
