// app/sitemap.ts
import type { MetadataRoute } from "next";
import { FIRMS } from "@/lib/firms";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://madprops.io";
  const now = new Date();

  // The base entries are contextually typed as MetadataRoute.Sitemap
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/firms`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/coming-soon`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Helper ensures each firm entry is typed exactly as a Sitemap item
  const toSitemapItem = (f: (typeof FIRMS)[number]): MetadataRoute.Sitemap[number] => ({
    url: `${base}/firm/${encodeURIComponent(f.key)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  });

  entries.push(...FIRMS.map(toSitemapItem));

  return entries;
}
