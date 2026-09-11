import type { Metadata } from "next";

export function generateStaticParams() {
  return [{ orderId: "_" }];
}

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function OrderDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
