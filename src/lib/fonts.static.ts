import { Outfit } from "next/font/google";

// GitHub Pages (static export) replacement for fonts.ts.
// Cormorant_Garamond is NOT loaded here — the next/font/google loader for that
// font cannot resolve in the CI environment used for static export.
// The system-serif stack defined in globals.css / Tailwind config applies instead.
// This file is copied over src/lib/fonts.ts by the deploy-pages workflow before build.

export const serifVariable = "";

export const sans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});
