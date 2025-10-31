// app/sitemap.ts
import type { MetadataRoute } from "next";
import { FIRMS } from "@/lib/firms";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://madprops.io";
  const now = new Date();

  // Base entries, typed precisely as a Sitemap
  const baseEntries = [
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
  ] satisfies MetadataRoute.Sitemap;

  // Firm pages, also typed as a Sitemap
  const firmEntries = FIRMS.map((f) => ({
    url: `${base}/firm/${encodeURIComponent(f.key)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  })) satisfies MetadataRoute.Sitemap;

  // Return combined
  return [...baseEntries, ...firmEntries];
}
