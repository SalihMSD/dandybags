import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Account</h1>
      <p className="mt-4 text-sm text-ink-soft">
        Customer login, addresses and order history will be available when checkout goes live.
      </p>
      <Link href="/contact" className="mt-8 inline-block underline">
        Contact DANDY
      </Link>
    </div>
  );
}
