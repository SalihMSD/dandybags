import type { NextConfig } from "next";

const isGitHubPages = process.env.CI === "true" && process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/dandybags" : "";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath,
  serverExternalPackages: ["@prisma/client", "prisma", "razorpay"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: isGitHubPages,
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
