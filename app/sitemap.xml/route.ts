// Explicit sitemap route that returns XML with correct headers/status
import { NextResponse } from "next/server";

type RawRoute = {
  pathname: string;
  lastModified?: string | Date | null;
  changeFrequency?: string | null;
  priority?: number | null;
};

const RAW_ROUTES: RawRoute[] = [
  { pathname: "/", changeFrequency: "daily", priority: 1, lastModified: new Date() },
  // Add more routes here as your site grows
];

const ALLOWED_CF = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

function normalizeChangeFrequency(
  input: string | null | undefined
): string | undefined {
  if (!input) return undefined;
  const v = input.trim().toLowerCase();
  return ALLOWED_CF.has(v) ? v : undefined;
}

function normalizeLastModified(
  v: string | Date | null | undefined
): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function toAbsoluteUrl(pathname: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://madprops.com";
  return new URL(pathname, base).toString();
}

function buildXml(): string {
  const items = RAW_ROUTES.map((route) => {
    const url = toAbsoluteUrl(route.pathname);
    const lastmod = normalizeLastModified(route.lastModified);
    const changefreq = normalizeChangeFrequency(route.changeFrequency);
    const priority = route.priority ?? 0.5;

    return [
      "  <url>",
      `    <loc>${url}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
      changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    "</urlset>",
  ].join("\n");
}

export async function GET(): Promise<NextResponse> {
  const xml = buildXml();
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
