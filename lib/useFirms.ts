// lib/useFirms.ts
"use client";

import { useEffect, useState } from "react";
import { FIRMS as FALLBACK_FIRMS, type Firm } from "./firms";

type RawRow = Record<string, string>;

const slugifyKey = (value: string | undefined) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export type FirmRow = {
  key: string;
  name: string;
  accountLabel?: string | null;
  payoutSplit?: number | null; // 0-100 (single value, use max if range)
  payoutDisplay?: string | null; // e.g., "80/90%" or "80-90%"
  maxFunding?: number | null;
  accountSize?: number | null;
  platforms?: string[];
  model?: string[];
  minDays?: number | null;
  daysToPayout?: number | string | null;
  drawdownType?: string | null;
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
          amount?: number;
          code?: string | null;
          label?: string | null;
        }
      | null;
    discountPct?: number | null;
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
function parseMoney(v: string | undefined) {
  const n = Number((v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
function parsePayout(raw: string | undefined): { pct?: number; display?: string } {
  const s = (raw ?? "").trim();
  if (!s) return {};
  // Try to detect two-part ranges like "80/90", "80-90", "80 to 90"
  const m = s.match(/(\d{1,3})\s*(?:[\/\-]|\s+to\s+)\s*(\d{1,3})/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const lo = Number.isFinite(a) ? a : undefined;
    const hi = Number.isFinite(b) ? b : undefined;
    const pct = hi ?? lo; // choose the higher end for filtering/sorting
    const display = [lo, hi].filter((x) => typeof x === "number").join("/") + "%";
    return { pct, display };
  }
  const num = parseNum(s);
  return { pct: num, display: typeof num === "number" ? `${Math.round(num)}%` : undefined };
}

function parseDaysField(raw: string | undefined): number | string | undefined {
  const s = (raw ?? "").trim();
  if (!s) return undefined;
  if (/[\/\-]/.test(s)) {
    const compact = s.replace(/\s+/g, "");
    return compact;
  }
  const num = parseNum(s);
  return typeof num === "number" ? num : undefined;
}

function parseDiscountLabel(raw: string | undefined): { percent?: number; amount?: number } {
  const s = (raw ?? "").trim();
  if (!s) return {};
  const mPct = s.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (mPct) {
    const p = Number(mPct[1]);
    return Number.isFinite(p) ? { percent: p } : {};
  }
  const amt = parseMoney(s);
  return typeof amt === "number" ? { amount: amt } : {};
}
function splitList(v: string | undefined) {
  if (!v) return [];
  return v
    .split(/[|/;,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Map one CSV row -> FirmRow */
function mapRow(r: RawRow): FirmRow {
  const evalCost = parseNum(r["eval_cost_usd"]);
  const activationFee = parseNum(r["activation_fee_usd"]);
  const discountPctRaw = r["discount_pct"];
  const discountValue = parseNum(discountPctRaw);
  const rawPayout = r["payout_pct"] ?? r["payout"] ?? r["payout_split"];
  const payoutParsed = parsePayout(rawPayout);
  const payoutPct = payoutParsed.pct;
  const discountLabelRaw = r["discount_label"] ?? r["Discount Label"] ?? r["discount"];
  const discountTypeRaw = (r["discount_type"] ?? "").toLowerCase().trim();
  const normalizedLabel = (discountLabelRaw ?? "").trim().toLowerCase();
  const labelLooksLikeType = /^(amount|flat|percent|percentage|%|\$)$/.test(normalizedLabel);
  const discountType = discountTypeRaw || (labelLooksLikeType ? normalizedLabel : "");
  const parsedLabel = labelLooksLikeType ? {} : parseDiscountLabel(discountLabelRaw);
  const discountLabelForDisplay = !labelLooksLikeType && discountLabelRaw ? discountLabelRaw : null;

  let discountPercent = typeof discountValue === "number" ? discountValue : undefined;
  let discountAmount: number | undefined;
  if (typeof discountValue === "number") {
    if (discountType === "amount" || discountType === "flat" || discountType === "$") {
      discountAmount = discountValue;
      discountPercent = undefined;
    } else if (discountType === "percent" || discountType === "percentage" || discountType === "%") {
      discountPercent = discountValue;
    }
  }

  if (discountPercent === undefined && typeof parsedLabel.percent === "number") {
    discountPercent = parsedLabel.percent;
  }
  if (discountAmount === undefined && typeof parsedLabel.amount === "number") {
    discountAmount = parsedLabel.amount;
    discountPercent = undefined;
  }
  const maxFunding = parseNum(r["max_funding_usd"]);
  const accountSize = parseNum(r["account_size_usd"] ?? r["account_size"] ?? r["account_size"]);
  const trustpilot = parseNum(
    r["trustpilot"] ??
      r["trustpilot_score"] ??
      r["trustpilot rating"] ??
      r["trustpilot_score_pct"] ??
      r["trustpilot_score_percent"]
  );

  const firmKey = r["firm_key"] ?? r["key"] ?? r["slug"] ?? "";
  const firmName = r["firm_name"] ?? r["name"] ?? "";

  // helpers to pick the first non-empty from multiple possible column names
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const val = r[k];
      if (val && String(val).trim()) return val;
    }
    return undefined;
  };

  const accountLabel = pick("account_label", "Account Label", "program_name", "Program Name", "account_name", "Account Name");
  const platformsStr =
    pick("platforms", "platform", "Platforms", "trading_platforms", "Trading Platforms", "Platform") ||
    r["platforms"];
  const modelStr = pick("model", "Model", "Program", "Program Type", "program") || r["model"];
  const daysToPayoutStr =
    pick(
      "days_to_payout",
      "Days to Payout",
      "daysToPayout",
      "days_to_first_payout",
      "first_payout_days",
      "payout_days"
    ) || r["days_to_payout"];
  const drawdownType =
    pick(
      "drawdown_type",
      "Drawdown Type",
      "ddt",
      "DDT",
      "drawdown"
    ) || r["drawdown_type"];

  const normalizedKey =
    (typeof firmKey === "string" && firmKey.trim().length > 0 ? slugifyKey(firmKey) : slugifyKey(firmName)) || "";
  const effectiveKey =
    (typeof firmKey === "string" && firmKey.trim().length > 0 ? firmKey.trim() : normalizedKey || firmName || "").trim();
  const fallbackLogoKey = normalizedKey;

  return {
    key: effectiveKey,
    name: firmName,
    accountLabel: accountLabel ?? null,
    payoutSplit: typeof payoutPct === "number" ? Math.round(payoutPct) : undefined,
    payoutDisplay: payoutParsed.display ?? null,
    maxFunding,
    accountSize: accountSize ?? maxFunding ?? null,
    platforms: splitList(platformsStr),
    model: splitList(modelStr),
    minDays: (() => {
      const source =
        r["min_days (Eval)"] ??
        r["Min Days (Eval)"] ??
        r["min days (Eval)"] ??
        r["min_days_eval"] ??
        r["min_days"] ??
        r["minDays"];
      const normalized = (source ?? "").trim().toLowerCase();
      if (normalized === "instant" || normalized === "instant funded") return 0;
      const parsed = parseNum(source);
      return typeof parsed === "number" ? parsed : undefined;
    })(),
    daysToPayout: (() => {
      const parsed = parseDaysField(daysToPayoutStr);
      return typeof parsed === "number" || typeof parsed === "string" ? parsed : null;
    })(),
    drawdownType: (drawdownType ?? "").trim() || null,
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
      discount:
        typeof discountPercent === "number" || typeof discountAmount === "number"
          ? {
              percent: discountPercent ?? undefined,
              amount: discountAmount ?? undefined,
              code: r["discount_code"] || null,
              label: discountLabelForDisplay,
            }
          : null,
      discountPct: typeof discountPercent === "number" ? discountPercent : undefined,
    },
    logo: r["logo_url"] || (fallbackLogoKey ? `/logos/${fallbackLogoKey}.png` : null),
  };
}

/** Convert bundled Firm -> FirmRow (used for fallback) */
function firmToRow(f: Firm): FirmRow {
  return {
    key: f.key,
    name: f.name,
    accountLabel: f.notes ?? null,
    payoutSplit: typeof f.payout === "number" ? Math.round(f.payout * 100) : null,
    payoutDisplay: undefined,
    maxFunding: f.maxFunding ?? null,
    accountSize: typeof f.accountSize === "number" ? f.accountSize : f.maxFunding ?? null,
    platforms: Array.isArray(f.platforms) ? f.platforms : [],
    model: Array.isArray(f.model) ? f.model : [],
    minDays: f.minDays ?? null,
    daysToPayout: f.daysToPayout ?? null,
    drawdownType: f.drawdownType ?? null,
    spreads: f.spreads ?? null,
    feeRefund: f.feeRefund ?? false,
    newsTrading: f.newsTrading ?? false,
    weekendHolding: f.weekendHolding ?? false,
    homepage: f.homepage ?? null,
    signup: f.signup ?? null,
    trustpilot: f.trustpilot ?? null,
    pricing: f.pricing ?? null,
    logo: f.logo ?? (f.key ? `/logos/${f.key}.png` : null),
  };
}

async function fetchCsvText(csvUrl: string): Promise<string> {
  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  return await res.text();
}

/** Safe CSV parser with guards + quoted field support */
function parseCsv(text: string): RawRow[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Strip BOM on the header line if present
const headerLine = (lines[0] ?? "").replace(/^\uFEFF/, "");
if (!headerLine) return [];

const header = headerLine.split(",").map((h) => h.trim());
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
        // Prefer NEXT_PUBLIC_* so it's available client-side
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
        // Fallback to bundled data (Firm[]) -> convert to FirmRow[]
        let firms: FirmRow[] = [];
        try {
          firms = (FALLBACK_FIRMS as Firm[])
            .map(firmToRow)
            .filter((f) => f.key && f.name);
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
