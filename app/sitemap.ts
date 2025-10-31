// app/sitemap.ts
import type { MetadataRoute } from "next";
import { FIRMS } from "@/lib/firms";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://madprops.io";
  const now = new Date();

  // Start with a correctly typed array
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

  // Add each firm page (note the literal narrowing and number priority)
  entries.push(
    ...FIRMS.map((f) => ({
      url: `${base}/firm/${encodeURIComponent(f.key)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  return entries;
}
