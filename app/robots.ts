// app/robots.ts
import type { MetadataRoute } from "next";

export const dynamic = "force-static"; // cache at build time

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.madprops.com").replace(/\/+$/, "");
  const host = (() => {
    try {
      return new URL(siteUrl).host;
    } catch {
      return "www.madprops.com";
    }
  })();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/admin", "/_next/", "/404"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host,
  };
}
