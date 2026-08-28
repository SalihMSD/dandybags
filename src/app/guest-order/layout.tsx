import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track your DANDY order using order ID and phone number.",
  alternates: { canonical: "/guest-order" },
  robots: { index: false, follow: false },
};

export default function GuestOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
