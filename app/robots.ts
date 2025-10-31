// app/robots.ts
import type { MetadataRoute } from "next";

export const dynamic = "force-static"; // cache at build time

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/admin", "/_next/", "/404"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
