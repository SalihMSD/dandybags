import { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { categories } from "@/lib/categories";
import { siteUrl } from "@/lib/site";

// Evaluated at build time.
const isStaticBuild = process.env.GITHUB_PAGES === "true";

// Must be a static string literal — Next.js parses route segment config via AST,
// not runtime evaluation. "force-static" is valid for both output:export (GH Pages)
// and Vercel (sitemap is generated at build time with DB access, refreshed each deploy).
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/wholesale`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/catalogue`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/manufacturing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/dealers`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/shipping`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/returns`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryRoutes = categories.map((c) => ({
    url: `${base}/categories/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // GitHub Pages: no Prisma — only include URLs that actually exist as static pages.
  if (isStaticBuild) {
    return [...staticRoutes, ...categoryRoutes];
  }

  // Vercel production: include DB-backed product URLs (existing behaviour).
  const dbProducts = await prisma.product.findMany({
    select: { slug: true },
  });

  const productRoutes = dbProducts.map((p) => ({
    url: `${base}/shop/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
