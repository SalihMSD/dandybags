import Link from "next/link";
import { AssetImage } from "./AssetImage";
import { Logo } from "./Logo";
import { site } from "@/lib/site";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-8rem)] bg-paper lg:grid-cols-2">
      <div className="relative hidden min-h-[28rem] overflow-hidden bg-cream lg:block">
        <AssetImage
          src="/products/dummy/hero-collection.png"
          alt="DANDY bags"
          fill
          className="object-cover object-center"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-paper/25" />
        <p className="absolute bottom-8 left-8 font-serif text-3xl text-ink italic">
          {site.tagline}
        </p>
      </div>
      <div className="flex items-center px-4 py-12 sm:px-8 md:px-12">
        <div className="mx-auto w-full max-w-md">
          <Logo />
          <p className="mt-4 text-[11px] tracking-[0.28em] text-ink-soft uppercase">{site.tagline}</p>
          <h1 className="mt-6 font-serif text-4xl">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export const fieldClass =
  "mt-1 h-12 w-full border border-ink/15 bg-paper px-4 text-base outline-none focus:border-ink";

export function AuthLinks() {
  return (
    <p className="mt-8 text-center text-xs text-ink-soft">
      <Link href="/" className="underline underline-offset-4">
        Back to DANDY
      </Link>
    </p>
  );
}
