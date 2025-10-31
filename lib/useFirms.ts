// lib/useFirms.ts
"use client";

import { useEffect, useState } from "react";
// If you keep a local fallback constant, import it here:
import { FIRMS as FALLBACK_FIRMS } from "./firms";

type RawRow = Record<string, string>;

export type FirmRow = {
  key: string;
  name: string;
  payoutSplit?: number | null; // 0-100
  maxFunding?: number | null;
  platforms?: string[];
  model?: string[];
  minDays?: number | null;
  spreads?: string | null;
  feeRefund?: boolean;
  newsTrading?: boolean;
  weekendHolding?: boolean;
  homepage?: string | null;
  signup?: string | null;
  trustpilot?: number | null;
  pricing?: {
    evalCost?: number;
    activationFee?: number;
    discount?:
      | {
          percent?: number;
          code?: string | null;
          label?: string | null;
        }
      | null;
  } | null;
  logo?: string | null;
};

function parseBool(v: string | undefined) {
  return (v ?? "").toLowerCase().trim() === "true";
}
function parseNum(v: string | undefined) {
  const n = Number((v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
function splitList(v: string | undefined) {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Map CSV -> FirmRow
function mapRow(r: RawRow): FirmRow {
  const evalCost = parseNum(r["eval_cost_usd"]);
  const activationFee = parseNum(r["activation_fee_usd"]);
  const discountPct = parseNum(r["discount_pct"]);
  const payoutPct = parseNum(r["payout_pct"]);
  const maxFunding = parseNum(r["max_funding_usd"]);
  const trustpilot = parseNum(r["trustpilot"]);

  const firmKey = r["firm_key"] ?? r["key"] ?? r["slug"] ?? "";
  const firmName = r["firm_name"] ?? r["name"] ?? "";

  return {
    key: firmKey,
    name: firmName,
    payoutSplit: payoutPct,
    maxFunding,
    platforms: splitList(r["platforms"]),
    model: splitList(r["model"]),
    minDays: parseNum(r["min_days"]),
    spreads: r["spreads"] ?? null,
    feeRefund: parseBool(r["fee_refund"]),
    newsTrading: parseBool(r["news_trading"]),
    weekendHolding: parseBool(r["weekend_holding"]),
    homepage: r["homepage_url"] || r["url"] || null,
    signup: r["signup_url"] || r["url"] || null,
    trustpilot,
    pricing: {
      evalCost,
      activationFee,
      discount: discountPct
        ? {
            percent: discountPct,
            code: r["discount_code"] || null,
            label: r["discount_label"] || null,
          }
        : null,
    },
    logo: r["logo_url"] || (firmKey ? `/logos/${firmKey}.png` : null),
  };
}

async function fetchCsvText(csvUrl: string): Promise<string> {
  // Client-side fetch: no Next.js "next" field here
  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  return await res.text();
}

function parseCsv(text: string): RawRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim());

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

    const row: RawRow = {};
    header.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    return row;
  });
}

export function useFirms() {
  const [state, setState] = useState<{
    firms: FirmRow[];
    loading: boolean;
    error?: string;
    isLive: boolean;
  }>({
    firms: [],
    loading: true,
    isLive: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Prefer NEXT_PUBLIC_* so it’s available to the client.
        const csvUrl =
          (process.env.NEXT_PUBLIC_SHEET_CSV_URL as string | undefined) ||
          (process.env.SHEET_CSV_URL as string | undefined) ||
          "";
        if (!csvUrl) throw new Error("Missing NEXT_PUBLIC_SHEET_CSV_URL");

        const text = await fetchCsvText(csvUrl);
        const rows = parseCsv(text);
        const firms = rows.map(mapRow).filter((f) => f.key && f.name);

        if (!cancelled) {
          setState({ firms, loading: false, isLive: true });
        }
      } catch (err: unknown) {
        // Fallback to bundled data (works fine on the client)
        let firms: FirmRow[] = [];
        try {
          // If your fallback is already FirmRow-like, keep it;
          // if it’s CSV-shaped, map it first.
          const raw = FALLBACK_FIRMS as unknown as RawRow[];
          firms = raw.map(mapRow).filter((f) => f.key && f.name);
        } catch {
          firms = [];
        }

        if (!cancelled) {
          setState({
            firms,
            loading: false,
            isLive: false,
            error: err instanceof Error ? err.message : "Failed to load CSV",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
