import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Your DANDY Account",
  robots: { index: false, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
