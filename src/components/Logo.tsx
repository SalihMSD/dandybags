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
        width={200}
        height={200}
        className={`h-10 w-10 object-contain object-center md:h-11 md:w-11 ${className}`}
        priority={priority}
      />
    );
  }
  if (variant === "wordmark") {
    return (
      <AssetImage
        src="/logo-wordmark.png"
        alt="dandy"
        width={280}
        height={90}
        className={`h-8 w-auto object-contain ${className}`}
        priority={priority}
      />
    );
  }
  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center ${className}`}
      aria-label="DANDY home"
    >
      <AssetImage
        src="/logo.png"
        alt="DANDY — Bags for every journey"
        width={900}
        height={280}
        className="h-[52px] w-auto max-w-[min(220px,58vw)] object-contain object-left sm:h-[60px] sm:max-w-[260px] md:h-[68px] md:max-w-[300px]"
        priority={priority}
      />
    </Link>
  );
}
