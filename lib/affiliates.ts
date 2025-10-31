// lib/affiliates.ts
import { AFFILIATE_CODES } from "@/lib/firms";

type Rule =
  | { type: "query"; param: string }
  | { type: "path"; segment: string };

const RULES: Record<string, Rule> = {
  blueguardian: { type: "path", segment: "ref" },   // → /ref/<code>/
  funderpro:    { type: "query", param: "bta" },    // → ?bta=<code>
  tradingfunds: { type: "path", segment: "aff" },   // → /aff/<code>/
};

const DEFAULT_RULE: Rule = { type: "query", param: "ref" };

export function buildAffiliateUrl(
  baseUrl: string,
  firmKey?: string,
  campaign?: string
): string {
  if (!baseUrl) return baseUrl;

  const key = firmKey?.toLowerCase?.() ?? "";
  // use bracket access for DEFAULT to keep TS happy on Record<string, string>
  const code = AFFILIATE_CODES[key] ?? AFFILIATE_CODES["DEFAULT"] ?? "";
  if (!code) return baseUrl;

  // Safe URL builder (handles relative URLs)
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    url = new URL(baseUrl, "https://example.com");
  }

  const rule = RULES[key] ?? DEFAULT_RULE;

  if (rule.type === "query") {
    url.searchParams.set(rule.param, code);
  } else {
    // remove trailing slashes, then append /segment/code/
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/${rule.segment}/${code}/`;
  }

  if (campaign) url.searchParams.set("campaign", campaign);

  // strip dummy origin if we faked one for relative URLs
  return url.origin === "https://example.com"
    ? url.toString().replace(/^https:\/\/example\.com/, "")
    : url.toString();
}
