"use client";

import Link from "next/link";
import { AssetImage } from "./AssetImage";

type Props = {
  variant?: "mark" | "lockup" | "wordmark";
  className?: string;
  priority?: boolean;
};

export function Logo({ variant = "lockup", className = "", priority }: Props) {
  if (variant === "mark") {
    return (
      <AssetImage
        src="/logo-mark.png"
        alt="DANDY"
        width={56}
        height={56}
        className={`h-10 w-10 object-contain md:h-12 md:w-12 ${className}`}
        priority={priority}
      />
    );
  }
  if (variant === "wordmark") {
    return (
      <AssetImage
        src="/logo-wordmark.png"
        alt="dandy"
        width={140}
        height={44}
        className={`h-8 w-auto object-contain ${className}`}
        priority={priority}
      />
    );
  }
  return (
    <Link href="/" className={`inline-flex min-w-0 max-w-full items-center ${className}`} aria-label="DANDY home">
      <AssetImage
        src="/logo.png"
        alt="DANDY — Bags for every journey"
        width={280}
        height={64}
        className="h-8 w-auto max-w-[min(11rem,48vw)] object-contain object-left md:h-12 md:max-w-none"
        priority={priority}
      />
    </Link>
  );
}
