import type { NextConfig, Redirect } from "next";
import path from "path";
import { buildAffiliateUrl } from "./lib/affiliates";
import { AFFILIATE_LINKS, FIRMS } from "./lib/firms";

const slugify = (value: string) =>
  (value ?? "").toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, "");

// Optional slug overrides for branded redirects
const SLUG_OVERRIDES: Record<string, string> = {
  fundednextfutures: "fundednext",
};

const normalizeSlug = (raw: string) => SLUG_OVERRIDES[raw] ?? raw;

// Map alias slugs to the affiliate-key used for code insertion (fallback path)
const AFFILIATE_KEY_OVERRIDES: Record<string, string> = {
  fundednext: "fundednextfutures",
  fundednextfutures: "fundednextfutures",
};

const resolveAffiliateKey = (raw: string) =>
  AFFILIATE_KEY_OVERRIDES[raw] ?? raw;

const DOMAIN_SLUG_MAP: Record<string, string> = {
  "fundednext.com": "fundednextfutures",
  "fundingticks.com": "fundingticks",
};

function detectSlugFromUrl(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const domain of Object.keys(DOMAIN_SLUG_MAP)) {
      if (host.includes(domain)) return DOMAIN_SLUG_MAP[domain];
    }
  } catch {
    // ignore invalid URLs
  }
  return undefined;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const header = (lines[0] ?? "").replace(/^\uFEFF/, "").split(",").map((h) => h.trim());
  if (!header.length) return [];

  return lines.slice(1).map((line) => {
    const cols: string[] = [];
    let current = "";
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cols.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current);

    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    return row;
  });
}

const pick = (obj: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const buildRedirectsFromRecords = (
  records: Array<Record<string, string>>,
  seen: Set<string>
): Redirect[] => {
  const redirects: Redirect[] = [];

  records.forEach((row) => {
    // Prefer firm_key/key for slugs so we don't pick product-level slugs
    let rawSlug = slugify(
      row["firm_key"] || row["key"] || row["slug"] || row["name"] || ""
    );
    const signup = pick(
      row,
      "signup_url",
      "signup",
      "url",
      "homepage_url",
      "home_page",
      "homepage"
    );
    const affiliate = pick(row, "affiliate_link", "affiliate_url", "affiliate");

    // If the URL clearly identifies the firm (e.g., fundednext.com), force that slug
    const urlForSlug = signup || affiliate || "";
    const domainSlug = detectSlugFromUrl(urlForSlug);
    if (domainSlug) rawSlug = domainSlug;

    const slug = normalizeSlug(rawSlug);
    if (!slug || seen.has(slug)) return;

    const affiliateKey = resolveAffiliateKey(rawSlug);
    const destination = affiliate || (signup ? buildAffiliateUrl(signup, affiliateKey) : "");
    if (!destination) return;

    redirects.push({ source: `/${slug}`, destination, permanent: true });
    seen.add(slug);
  });

  return redirects;
};

const buildRedirectsFromFirms = (seen: Set<string>): Redirect[] => {
  const redirects: Redirect[] = [];

  FIRMS.forEach((firm) => {
    const rawSlug = slugify(firm.key || firm.name);
    const slug = normalizeSlug(rawSlug);
    if (!slug || seen.has(slug)) return;

    const explicit = (AFFILIATE_LINKS[firm.key] ?? firm.affiliateUrl ?? "").trim();
    const base = explicit || (firm.signup ?? firm.homepage ?? "").trim();
    if (!base) return;

    const affiliateKey = resolveAffiliateKey(rawSlug);
    const destination = explicit || buildAffiliateUrl(base, affiliateKey);
    if (!destination) return;

    redirects.push({ source: `/${slug}`, destination, permanent: true });
    seen.add(slug);
  });

  return redirects;
};

async function loadCsvRows() {
  const csvUrl =
    (process.env.NEXT_PUBLIC_SHEET_CSV_URL as string | undefined) ||
    (process.env.SHEET_CSV_URL as string | undefined) ||
    "";
  if (!csvUrl) {
    console.error("CSV redirects: missing NEXT_PUBLIC_SHEET_CSV_URL");
    return [] as Array<Record<string, string>>;
  }

  try {
    const res = await fetch(csvUrl, { cache: "no-store" });
    if (!res.ok) {
      console.error("CSV redirects: fetch failed", res.status, res.statusText);
      return [] as Array<Record<string, string>>;
    }
    const text = await res.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      console.warn("CSV redirects: parsed 0 rows");
    } else {
      const sampleSlug = rows[0]?.slug || rows[0]?.key || rows[0]?.firm_key || rows[0]?.name || "";
      console.log(
        `CSV redirects: loaded ${rows.length} rows${sampleSlug ? `, first slug ${sampleSlug}` : ""}`
      );
    }
    return rows;
  } catch {
    console.error("CSV redirects: fetch threw");
    return [] as Array<Record<string, string>>;
  }
}

const nextConfig: NextConfig = {
  // Don't fail the Vercel build because of ESLint problems.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Allow remote images from your firm logo sources
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co", // sample fallback
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com", // e.g. Discord-hosted logos
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "madprops.com", // your future CDN / uploads
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com", // if you store logos in GitHub
        port: "",
        pathname: "/**",
      },
    ],
  },

  // Webpack alias (unchanged)
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },

  async redirects() {
    const seen = new Set<string>();
    const csvRedirects = buildRedirectsFromRecords(await loadCsvRows(), seen);
    const fallbackRedirects = buildRedirectsFromFirms(seen);
    return [...csvRedirects, ...fallbackRedirects];
  },
};

export default nextConfig;
