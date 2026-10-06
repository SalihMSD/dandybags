import { Cormorant_Garamond, Outfit } from "next/font/google";

// Vercel production: full Google Font setup — identical to the original layout.tsx config.
// On GitHub Pages, this file is replaced by fonts.static.ts before the build
// (see .github/workflows/deploy-pages.yml), so this code never runs in CI.

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const serifVariable = serif.variable;

export const sans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});
