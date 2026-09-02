"use client";

import { usePathname } from "next/navigation";
import { CartFloatingButton } from "@/components/CartFloatingButton";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

type Props = { children: React.ReactNode };

export function StorefrontShell({ children }: Props) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-w-0">{children}</main>
      <Footer />
      <CartFloatingButton />
    </>
  );
}
