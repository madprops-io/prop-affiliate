// app/api/firms/route.ts
import { NextResponse } from "next/server";
import Papa from "papaparse";

const SHEET_URL = process.env.SHEET_CSV_URL!;
export const revalidate = 600;

// ---------- helpers ----------
const first = <T = any>(...vals: T[]) =>
  vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

const toNumber = (v: any, d = null as number | null) => {
  if (v == null) return d;
  const s = String(v).replace(/[$,%\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
};
const toInt = (v: any, d = null as number | null) => {
  const n = toNumber(v, d);
  return n == null ? n : Math.trunc(n);
};
const toBool = (v: any) => /^(true|yes|y|1)$/i.test(String(v ?? "").trim());
const toArray = (v: any) =>
  !v
    ? []
    : String(v)
        .split(/[|,/;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

type Firm = {
  key: string;
  name: string;
  model: "Instant" | "1-Phase" | "2-Phase" | "Scaling" | string;
  maxFunding: number | null;
  payoutSplit: number | null; // store the MAX/MOST ATTRACTIVE split as a single number (e.g., 80)
  platforms: string[];
  cap?: number | null;
  score?: number | null;
  url?: string | null;
};

// ----- UPDATED normalizeRow (maps your headers) -----
function normalizeRow(r: any, i: number) {
  // name (supports your `firm_name`)
  const name = first(
    r.name,
    r.Name,
    r.firm,
    r.Firm,
    r["Firm Name"],
    r.firm_name
  );

  // key (prefer provided; else slugified name)
  const key =
    (first(r.key, r.Key, r.slug, r.Slug, r["Firm Key"]) as string) ||
    String(name || `firm-${i}`).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // model/program (map common labels)
  const rawProgram = first(r.model, r.Model, r["Program"], r["Program Type"], r.program);
  let model = rawProgram as Firm["model"];
  if (typeof model === "string") {
    const p = model.toLowerCase();
    if (/(instant|instant funding)/.test(p)) model = "Instant";
    else if (/(^1$|^one$|1[\s-]?phase|one[\s-]?(phase|step))/.test(p)) model = "1-Phase";
    else if (/(^2$|^two$|2[\s-]?phase|two[\s-]?(phase|step))/.test(p)) model = "2-Phase";
    else if (/scal(e|ing)/.test(p)) model = "Scaling";
  }

  // funding (map your `account_size_usd`)
  const maxFunding =
    toNumber(first(r.maxFunding, r["Max Funding"], r["Maximum Funding"], r.account_size_usd)) ??
    toNumber(first(r.funding, r.Funding));

  // payout split (supports your `payout_split_pct`, %, and ranges)
  const rawSplit = first(
    r.payoutSplit,
    r["Payout"],
    r["Payout Split"],
    r["Split"],
    r["Max Split"],
    r.payout_split_pct
  );
let payoutSplit = toNumber(rawSplit);
if (payoutSplit == null && typeof rawSplit === "string") {
  const m = rawSplit.match(/(\d+)\s*-\s*(\d+)/);
  if (m) payoutSplit = toNumber(m[2]);
}
// treat 0 as "unknown"
if (payoutSplit === 0) payoutSplit = null;

  // platforms (your `platforms` already matches)
  const platforms = toArray(
    first(
      r.platforms,
      r.Platforms,
      r.platform,
      r.Platform,
      r["Trading Platforms"]
    )
  );

  const cap = toNumber(first(r.cap, r.Cap, r["Evaluation Cap"]));
  const score = toNumber(first(r.score, r.Score));

  // url (map your `website`)
  const url =
    first(r.url, r.URL, r.website, r.Website, r.link, r.Link, r["Signup URL"]) || null;

  const firm: Firm = {
    key,
    name,
    model,
    maxFunding: maxFunding ?? null,
    payoutSplit: payoutSplit ?? null,
    platforms,
    cap: cap ?? null,
    score: score ?? null,
    url,
  };

  const issues: string[] = [];
  if (!name) issues.push("missing name");
  if (!model) issues.push("missing model");
if (payoutSplit == null) issues.push("missing payoutSplit");
  return { firm, issues };
}

// ---------- route ----------
export async function GET(req: Request) {
  try {
    if (!SHEET_URL)
      return NextResponse.json(
        { error: "SHEET_CSV_URL is not set" },
        { status: 500 }
      );

    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1";
    const raw = searchParams.get("raw") === "1";
    const nocache = searchParams.get("nocache") === "1";

    const res = await fetch(SHEET_URL, {
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

    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });

    if (raw) {
      return NextResponse.json(
        {
          columns: Object.keys((parsed.data as any[])[0] || {}),
          rows: parsed.data,
          errors: parsed.errors,
        },
        { status: 200 }
      );
    }

    const rows = (parsed.data as any[]).filter(
      (r) => Object.values(r).some((v) => String(v ?? "").trim() !== "")
    );

    const firms: Firm[] = [];
    const issues: Array<{ row: number; key?: string; problems: string[] }> = [];

    rows.forEach((r, i) => {
      const { firm, issues: probs } = normalizeRow(r, i);
      firms.push(firm);
      if (probs.length) issues.push({ row: i + 2, key: firm.key, problems: probs }); // +2 for header + 1-index
    });

    const payload: any = { firms };
    if (debug) {
      payload.meta = {
        count: firms.length,
        sheetColumns: Object.keys(rows[0] || {}),
        parseErrors: parsed.errors,
        issues,
      };
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
