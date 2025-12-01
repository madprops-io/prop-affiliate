// app/sitemap.ts
import type { MetadataRoute } from 'next';

/** Raw input shape — adjust to whatever your data looks like */
type RawRoute = {
  pathname: string;
  lastModified?: string | Date | null;
  changeFrequency?: string | null; // <- note: plain string from CMS/DB
  priority?: number | null;
};

/** Example: however you’re building your list now */
const RAW_ROUTES: RawRoute[] = [
  { pathname: '/', changeFrequency: 'daily', priority: 1, lastModified: new Date() },
  // …
];

/** Allowed literal set from Next’s types */
type AllowedCF = NonNullable<
  MetadataRoute.Sitemap[number]['changeFrequency']
>;

const ALLOWED_CF = new Set<AllowedCF>([
  'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly',
]);

function normalizeChangeFrequency(
  input: string | null | undefined
): MetadataRoute.Sitemap[number]['changeFrequency'] {
  if (!input) return undefined;
  const v = input.trim().toLowerCase();
  return ALLOWED_CF.has(v as AllowedCF) ? (v as AllowedCF) : undefined;
}

function normalizeLastModified(
  v: string | Date | null | undefined
): MetadataRoute.Sitemap[number]['lastModified'] {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toAbsoluteUrl(pathname: string): string {
  // Replace with your canonical domain if you want it hardcoded:
  // return new URL(pathname, 'https://madprops.com').toString();
  // Using NEXT_PUBLIC_SITE_URL lets you vary in envs:
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://madprops.com';
  return new URL(pathname, base).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  return RAW_ROUTES.map((route) => ({
    url: toAbsoluteUrl(route.pathname),
    lastModified: normalizeLastModified(route.lastModified),
    changeFrequency: normalizeChangeFrequency(route.changeFrequency),
    priority: route.priority ?? 0.5,
  }));
}
