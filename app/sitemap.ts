// app/sitemap.ts
import type { MetadataRoute } from "next";
// if your firms live at app/data/firms.ts, this relative import is correct:
import { FIRMS } from "../lib/firms";

export const dynamic = "force-static"; // build-time output

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const now = new Date();

  // Core pages you already have:
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/disclosure`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // If/when you add dedicated detail pages at /firm/[key], these will “just work”.
  // For now they won’t break anything if the route doesn’t exist, but you can
  // toggle this block off by setting includeFirmPages = false.
  const includeFirmPages = false; // set to true after you add /app/firm/[key]/page.tsx
  if (includeFirmPages) {
    entries.push(
      ...FIRMS.map((f) => ({
        url: `${base}/firm/${encodeURIComponent(f.key)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      }))
    );
  }

  return entries;
}
