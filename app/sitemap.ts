// app/sitemap.ts
import type { MetadataRoute } from "next";
import { FIRMS } from "@/lib/firms";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://madprops.io";
  const now = new Date();

  // Helper that returns exactly one valid sitemap entry
  const entry = (
    url: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number
  ): MetadataRoute.Sitemap[number] => ({
    url,
    lastModified: now,
    changeFrequency, // exact union type, not widened
    priority,
  });

  const baseEntries = [
    entry(`${base}/`, "weekly", 1),
    entry(`${base}/firms`, "weekly", 0.8),
    entry(`${base}/coming-soon`, "monthly", 0.3),
  ];

  const firmEntries = FIRMS.map<MetadataRoute.Sitemap[number]>((f) =>
    entry(`${base}/firm/${encodeURIComponent(f.key)}`, "weekly", 0.7)
  );

  // Assert the whole array matches the sitemap spec
  return [...baseEntries, ...firmEntries] satisfies MetadataRoute.Sitemap;
}
