import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login with Phone",
  robots: { index: false, follow: false },
};

export default function PhoneLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
