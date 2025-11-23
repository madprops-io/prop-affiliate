// app/api/firms/route.ts
import { NextResponse, type NextRequest } from "next/server";
import Papa from "papaparse";
import type { Firm } from "@/lib/types";
import { normalizeModelField } from "@/lib/modelTags";

export const revalidate = 600;

// Prefer the public one you set in .env(.local), but allow fallback:
const CSV_URL =
  process.env.NEXT_PUBLIC_SHEET_CSV_URL ?? process.env.SHEET_CSV_URL;

// ---------- helper types ----------
type FirmCsvRow = Record<string, string | undefined>;

// ---------- helpers (typed, no 'any') ----------
const first = <T>(...vals: (T | undefined | null)[]) =>
  vals.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== ""
  ) as T | undefined;

const toNumber = (v: string | undefined | null, d: number | null = null) => {
  if (!v) return d;
  const s = String(v).replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
};

const toInt = (v: string | undefined | null, d: number | null = null) => {
  const n = toNumber(v, d);
  return n == null ? n : Math.trunc(n);
};

const toBool = (v: string | undefined | null) =>
  v ? /^(true|yes|y|1)$/i.test(v) : false;

const toArray = (v: string | undefined | null) =>
  v
    ? String(v)
        .split(/[|,/;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

// ----- map a CSV row -> Firm -----
// ----- map a CSV row -> Firm -----
function normalizeRow(r: FirmCsvRow, i: number) {
  const name =
    first(
      r.name,
      r.Name,
      r.firm,
      r.Firm,
      r["Firm Name"],
      r.firm_name
    ) ?? "";

  const key =
    first(r.key, r.Key, r.slug, r.Slug, r["Firm Key"]) ??
    String(name || `firm-${i}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

  // model/program
  const rawProgram =
    first(r.model, r.Model, r.Program, r["Program Type"], r.program) ?? "";
  const normalizedModel = normalizeModelField(rawProgram);
  let model: Firm["model"] | string = "";
  if (Array.isArray(normalizedModel)) model = normalizedModel;
  else if (normalizedModel) model = normalizedModel;
  else if (rawProgram.trim()) model = rawProgram.trim();

  // funding (aka “account size”)
  const maxFunding =
    toNumber(first(r.maxFunding, r["Max Funding"], r["Maximum Funding"], r.account_size_usd)) ??
    toNumber(first(r.funding, r.Funding));

  // payout split (supports "70 - 80")
  const rawSplit =
    first(
      r.payoutSplit,
      r.Payout,
      r["Payout Split"],
      r.Split,
      r["Max Split"],
      r.payout_split_pct
    ) ?? "";
  let payoutSplit = toNumber(rawSplit);
  if (payoutSplit == null && rawSplit) {
    const m = rawSplit.match(/(\d+)\s*-\s*(\d+)/);
    if (m) payoutSplit = toNumber(m[2]) ?? null;
  }
  if (payoutSplit === 0) payoutSplit = null;

  // platforms
  const platforms = toArray(
    first(r.platforms, r.Platforms, r.platform, r.Platform, r["Trading Platforms"]) ?? ""
  );

  const cap = toInt(first(r.cap, r.Cap, r["Evaluation Cap"]) ?? null);
  const score = toNumber(first(r.score, r.Score) ?? null);

  // urls
  const url =
    first(r.url, r.URL, r.website, r.Website, r.link, r.Link, r["Signup URL"]) ?? null;

  // pricing fields from your sheet
  const evalCost = toNumber(first(r.eval_cost_usd, r.evalCostUsd, r["Eval Cost USD"]) ?? null);
  const activationFee =
    toNumber(first(r.activation_fee_usd, r.activationFeeUsd, r["Activation Fee USD"]) ?? null) ?? null;
  const discountPctRaw = first(r.discount_pct, r.discountPct, r["Discount %"]);
  const discountValue = toNumber(discountPctRaw ?? null);
  const discountLabelRaw = first(r.discount_label, r.discountLabel, r["Discount Label"]) ?? "";
  const discountTypeRaw = String(first(r.discount_type, r.discountType) ?? "").trim().toLowerCase();
  const normalizedLabel = String(discountLabelRaw ?? "").trim().toLowerCase();
  const labelIsType = /^(amount|flat|percent|percentage|%|\$)$/.test(normalizedLabel);
  const discountType = discountTypeRaw || (labelIsType ? normalizedLabel : "");
  const discountLabel = !labelIsType && discountLabelRaw ? String(discountLabelRaw) : null;
  let discountPercent: number | null = null;
  let discountAmount: number | null = null;
  if (typeof discountValue === "number" && Number.isFinite(discountValue)) {
    if (discountType === "amount" || discountType === "flat" || discountType === "$") {
      discountAmount = discountValue;
    } else if (discountType === "percent" || discountType === "percentage" || discountType === "%") {
      discountPercent = discountValue;
    } else {
      discountPercent = discountValue;
    }
  }
  if (!discountAmount && !discountPercent && labelIsType === false && typeof discountLabel === "string") {
    const parsed = parseFloat(discountLabel.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(parsed)) {
      if (/(amount|\$|off\s+\$)/i.test(discountLabel)) discountAmount = parsed;
      else discountPercent = parsed;
    }
  }
  const feeRefundRaw = first(r.fee_refund, r.feeRefund, r["Fee Refund"]) ?? null;

  const firm: Firm = {
    key,
    name,
    model, // string|string[]
    maxFunding: maxFunding ?? null,
    payoutSplit: payoutSplit ?? null,
    platforms,
    cap: cap ?? null,
    score: score ?? null,
    url: url ?? null,

    // NEW: provide pricing to the frontend
    pricing: {
      evalCost: evalCost ?? null,
      activationFee,
      discount:
        discountPercent != null || discountAmount != null
          ? { percent: discountPercent, amount: discountAmount, label: discountLabel }
          : null,
      discountPct: discountPercent ?? undefined,
    },

    // Optional: whether eval fee is refunded on first payout
    feeRefund: feeRefundRaw ? toBool(feeRefundRaw) : null,
  };

  const issues: string[] = [];
  if (!name) issues.push("missing name");
  if (!model) issues.push("missing model");
  if (payoutSplit == null) issues.push("missing payoutSplit");

  return { firm, issues };
}

// ---------- route ----------
export async function GET(req: NextRequest) {
  try {
    if (!CSV_URL) {
      return NextResponse.json(
        { error: "SHEET CSV URL is not set (NEXT_PUBLIC_SHEET_CSV_URL or SHEET_CSV_URL)" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1";
    const raw = searchParams.get("raw") === "1";
    const nocache = searchParams.get("nocache") === "1";

    const res = await fetch(CSV_URL, {
      cache: nocache ? "no-store" : "force-cache",
      next: { revalidate: nocache ? 0 : revalidate },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `CSV fetch failed (${res.status})` },
        { status: 502 }
      );
    }
    const csv = await res.text();

    const parsed = Papa.parse<FirmCsvRow>(csv, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });

    if (raw) {
      return NextResponse.json(
        {
          columns: Object.keys((parsed.data[0] || {}) as FirmCsvRow),
          rows: parsed.data,
          errors: parsed.errors,
        },
        { status: 200 }
      );
    }

    const rows = parsed.data.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").trim() !== "")
    );

    const firms: Firm[] = [];
    const issues: Array<{ row: number; key?: string; problems: string[] }> = [];

    rows.forEach((r, i) => {
      const { firm, issues: probs } = normalizeRow(r, i);
      firms.push(firm);
      if (probs.length) issues.push({ row: i + 2, key: firm.key, problems: probs });
    });

    const payload: { firms: Firm[]; meta?: unknown } = { firms };
    if (debug) {
      payload.meta = {
        count: firms.length,
        sheetColumns: Object.keys(rows[0] || {}),
        parseErrors: parsed.errors,
        issues,
      };
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
