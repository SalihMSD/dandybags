import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { site } from "@/lib/site";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://salihmsd.github.io/dandybags"),
  title: {
    default: "DANDY — Bags for every journey | Bag shop Karur",
    template: "%s | DANDY",
  },
  description: site.description,
  keywords: [
    "Dandy bags",
    "Dandy bags Karur",
    "Bag shop Karur",
    "Bag manufacturer Tamil Nadu",
    "School bags Tamil Nadu",
    "College bags Tamil Nadu",
    "Backpacks Tamil Nadu",
    "Travel bags Tamil Nadu",
    "Sling bags",
    "Handbags",
    "Ladies purses",
    "Wholesale bags Tamil Nadu",
  ],
  openGraph: {
    title: "DANDY — Bags for every journey",
    description: site.description,
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.png`,
    apple: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/apple-touch-icon.png`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} font-sans antialiased`}>
        <AuthProvider>
          <Header />
          <main className="min-w-0">{children}</main>
          <Footer />
          <WhatsAppButton />
        </AuthProvider>
      </body>
    </html>
  );
}
