import type { Metadata } from "next";

export function generateStaticParams() {
  return [{ orderId: "_" }];
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminOrderDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
