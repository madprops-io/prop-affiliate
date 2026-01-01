"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { getCosts, type Pricing } from "@/lib/pricing";
import { FIRMS, type Firm as StaticFirm } from "@/lib/firms";
import { useFirms, type FirmRow } from "@/lib/useFirms";
import type { Discount } from "@/lib/types";
import { useMemo } from "react";
import { formatFundingOrAccounts } from "@/lib/funding";

const slugify = (value: string | undefined | null) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

type FirmProfile = {
  key: string;
  name: string;
  logo?: string | null;
  homepage?: string | null;
  signup?: string | null;
  notes?: string | null;
  model: string[];
  platforms: string[];
  payoutPct?: number | null;
  maxFunding?: number | null;
  accountSize?: number | null;
  maxAccounts?: number | null;
  minDays?: number | null;
  daysToPayout?: number | string | null;
  drawdownType?: string | null;
  spreads?: string | null;
  trustpilot?: number | null;
  feeRefund?: boolean;
  newsTrading?: boolean;
  newsTradingEval?: boolean | null;
  newsTradingFunded?: boolean | null;
  weekendHolding?: boolean;
  pricing?: Pricing | null;
  discount?: Discount | null;
};

function normalizeArray(input: unknown): string[] {
  if (Array.isArray(input)) return input.filter(Boolean).map((item) => String(item));
  if (typeof input === "string" && input.trim()) return [input.trim()];
  return [];
}

type RawFirm = FirmRow | StaticFirm;

function normalizePricing(pricing: Pricing | Record<string, unknown> | null | undefined) {
  if (!pricing) return null;
  const record = pricing as Record<string, unknown>;
  const evalCost =
    (pricing as Pricing).evalCost ??
    (record.evalFee as number | undefined) ??
    (record.eval_fee as number | undefined) ??
    (record.eval as number | undefined) ??
    (record.cost as number | undefined) ??
    null;
  const activationFee =
    (pricing as Pricing).activationFee ??
    (record.activation_fee as number | undefined) ??
    (record.activation as number | undefined) ??
    null;
  return {
    evalCost: typeof evalCost === "number" ? evalCost : undefined,
    activationFee: typeof activationFee === "number" ? activationFee : undefined,
    discount: ((pricing as Pricing).discount ?? (record.discount as Discount | null)) ?? null,
    discountPct: (pricing as Pricing).discountPct ?? (record.discount_pct as number | undefined) ?? undefined,
  };
}

function normalizeFirmRow(row: RawFirm | null | undefined): FirmProfile | null {
  if (!row) return null;
  const rowAlt = row as FirmRow & {
    url?: string | null;
    notes?: string | null;
    days_to_payout?: number | string | null;
    drawdown_type?: string | null;
  };
  const payoutSplit = typeof rowAlt.payoutSplit === "number" ? rowAlt.payoutSplit : null;
  const payoutValue = (row as StaticFirm).payout;
  const payout =
    typeof payoutValue === "number"
      ? payoutValue * (payoutValue <= 1 ? 100 : 1)
      : payoutSplit != null
      ? payoutSplit
      : null;
  const normalizedPricing = normalizePricing(rowAlt.pricing);

  return {
    key: rowAlt.key,
    name: rowAlt.name,
    logo: rowAlt.logo ?? (rowAlt.key ? `/logos/${rowAlt.key}.png` : null),
    homepage: rowAlt.homepage ?? rowAlt.url ?? null,
    signup: rowAlt.signup ?? rowAlt.url ?? null,
    notes: rowAlt.notes ?? rowAlt.accountLabel ?? null,
    model: normalizeArray(rowAlt.model),
    platforms: normalizeArray(rowAlt.platforms),
    payoutPct: typeof payout === "number" ? Math.round(payout) : null,
    maxFunding: typeof rowAlt.maxFunding === "number" ? rowAlt.maxFunding : null,
    maxAccounts: typeof rowAlt.maxAccounts === "number" && rowAlt.maxAccounts > 0 ? rowAlt.maxAccounts : null,
    accountSize: typeof rowAlt.accountSize === "number" ? rowAlt.accountSize : rowAlt.maxFunding ?? null,
    minDays: typeof rowAlt.minDays === "number" ? rowAlt.minDays : null,
    daysToPayout: rowAlt.daysToPayout ?? rowAlt.days_to_payout ?? null,
    drawdownType: rowAlt.drawdownType ?? rowAlt.drawdown_type ?? null,
    spreads: rowAlt.spreads ?? null,
    trustpilot: typeof rowAlt.trustpilot === "number" ? rowAlt.trustpilot : null,
    feeRefund: Boolean(rowAlt.feeRefund),
    newsTrading:
      typeof rowAlt.newsTrading === "boolean"
        ? rowAlt.newsTrading
        : [rowAlt.newsTradingEval, rowAlt.newsTradingFunded].some((v) => v === true),
    newsTradingEval: typeof rowAlt.newsTradingEval === "boolean" ? rowAlt.newsTradingEval : null,
    newsTradingFunded: typeof rowAlt.newsTradingFunded === "boolean" ? rowAlt.newsTradingFunded : null,
    weekendHolding: Boolean(rowAlt.weekendHolding),
    pricing: normalizedPricing,
    discount: normalizedPricing?.discount ?? null,
  };
}

function normalizeStaticFirm(row: RawFirm | null | undefined): FirmProfile | null {
  if (!row) return null;
  const rowAlt = row as FirmRow & {
    url?: string | null;
    notes?: string | null;
  };
  const normalizedPricing = normalizePricing(rowAlt.pricing);
  return {
    key: rowAlt.key,
    name: rowAlt.name,
    logo: rowAlt.logo ?? (rowAlt.key ? `/logos/${rowAlt.key}.png` : null),
    homepage: rowAlt.homepage ?? null,
    signup: rowAlt.signup ?? null,
    notes: rowAlt.notes ?? rowAlt.accountLabel ?? null,
    model: normalizeArray(rowAlt.model),
    platforms: normalizeArray(rowAlt.platforms),
    payoutPct:
      typeof (row as StaticFirm).payout === "number"
        ? Math.round((row as StaticFirm).payout * ((row as StaticFirm).payout <= 1 ? 100 : 1))
        : null,
    maxFunding: typeof rowAlt.maxFunding === "number" ? rowAlt.maxFunding : null,
    maxAccounts: typeof rowAlt.maxAccounts === "number" && rowAlt.maxAccounts > 0 ? rowAlt.maxAccounts : null,
    accountSize: typeof rowAlt.accountSize === "number" ? rowAlt.accountSize : rowAlt.maxFunding ?? null,
    minDays: typeof rowAlt.minDays === "number" ? rowAlt.minDays : null,
    daysToPayout: rowAlt.daysToPayout ?? null,
    drawdownType: rowAlt.drawdownType ?? null,
    spreads: rowAlt.spreads ?? null,
    trustpilot: typeof rowAlt.trustpilot === "number" ? rowAlt.trustpilot : null,
    feeRefund: Boolean(rowAlt.feeRefund),
    newsTrading:
      typeof rowAlt.newsTrading === "boolean"
        ? rowAlt.newsTrading
        : [rowAlt.newsTradingEval, rowAlt.newsTradingFunded].some((v) => v === true),
    newsTradingEval: typeof rowAlt.newsTradingEval === "boolean" ? rowAlt.newsTradingEval : null,
    newsTradingFunded: typeof rowAlt.newsTradingFunded === "boolean" ? rowAlt.newsTradingFunded : null,
    weekendHolding: Boolean(rowAlt.weekendHolding),
    pricing: normalizedPricing,
    discount: normalizedPricing?.discount ?? null,
  };
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `$${value.toLocaleString()}`;
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value}%`;
}

export default function FirmDetailPage() {
  const params = useParams<{ key: string }>();
  const firmKey = slugify(params?.key as string) ?? "";
  const { firms, isLive, loading } = useFirms();

  const matchingRows = useMemo(() => {
    if (!Array.isArray(firms)) return null;
    const matches = firms.filter((row) => {
      const rowKey = typeof row.key === "string" ? row.key : "";
      const rowSlug = slugify(rowKey);
      const nameSlug = slugify(row.name);
      return rowKey === firmKey || rowSlug === firmKey || nameSlug === firmKey;
    });
    return matches;
  }, [firms, firmKey]);
  const csvFirm = Array.isArray(matchingRows) && matchingRows.length > 0 ? matchingRows[0] : null;

  const normalizedMatches: FirmProfile[] = useMemo(() => {
    if (!Array.isArray(matchingRows)) return [];
    return matchingRows
      .map((row) => normalizeFirmRow(row))
      .filter((row): row is FirmProfile => row != null);
  }, [matchingRows]);

  const featuredAccountSize = useMemo(() => {
    const pool = normalizedMatches.filter((row) => typeof row.accountSize === "number");
    if (!pool.length) return null;
    const target50k = pool.filter((row) => Math.abs((row.accountSize ?? 0) - 50_000) < 1);
    const candidates = target50k.length > 0 ? target50k : pool;
    return candidates.reduce<{ size: number; cost: number } | null>((best, row) => {
      const size = row.accountSize ?? 0;
      const cost = getCosts({ pricing: row.pricing ?? undefined, feeRefund: row.feeRefund }).trueCost;
      if (!best) return { size, cost };
      if (cost < best.cost) return { size, cost };
      if (cost === best.cost && size < best.size) return { size, cost };
      return best;
    }, null)?.size ?? null;
  }, [normalizedMatches]);
  const selected =
    normalizeFirmRow(csvFirm) ||
    normalizeStaticFirm(
      (FIRMS as FirmProfile[]).find((row) => row.key === firmKey || row.key === firmKey.replace(/-/g, ""))
    );

  if (!firmKey || (!selected && !loading)) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#040912] via-[#02050a] to-[#010307] text-white px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-3xl font-semibold">Firm not found</h1>
          <p className="text-white/70">Head back to the full directory to browse all firms.</p>
          <Button asChild>
            <Link href="/firms">Back to directory</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!selected) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#040912] via-[#02050a] to-[#010307] text-white px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <p className="text-white/70">Loading live firm data…</p>
        </div>
      </main>
    );
  }

  const costs = getCosts({
    pricing: selected.pricing ?? undefined,
    feeRefund: selected.feeRefund,
  });
  const fundingDisplay = formatFundingOrAccounts(selected.maxFunding, selected.maxAccounts);

  const affiliateUrl = buildAffiliateUrl(selected.signup ?? selected.homepage ?? "", selected.key);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#040912] via-[#02050a] to-[#010307] text-white px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-3 text-sm text-white/60">
          <Link href="/firms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">
            &larr; Back to directory
          </Link>
          <span className="text-white/40">/</span>
          <span className="uppercase tracking-[0.4em] text-white/50">Firm breakdown</span>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_35px_90px_-45px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3">
                {selected.logo ? (
                  <Image
                    src={selected.logo}
                    alt={`${selected.name} logo`}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-lg font-semibold">{selected.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-semibold">{selected.name}</h1>
                {selected.notes ? (
                  <p className="text-sm text-white/70">{selected.notes}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
                  {selected.model.map((model) => (
                    <Badge key={`model-${model}`} className="bg-white/10 text-white">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap gap-3">
              {affiliateUrl ? (
                <Button asChild className="flex-1 min-w-[180px] bg-gradient-to-r from-emerald-300 to-emerald-200 text-slate-950">
                  <a href={affiliateUrl} target="_blank" rel="nofollow sponsored noopener">
                    Open account
                  </a>
                </Button>
              ) : null}
              {selected.homepage ? (
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 min-w-[160px] border-white/30 text-white hover:bg-white/10"
                >
                  <a href={selected.homepage} target="_blank" rel="nofollow noopener">
                    Visit website
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm text-white/60">
            <span className="text-white/50">Platforms:</span>
            {selected.platforms.length > 0 ? (
              selected.platforms.map((platform) => (
                <span key={platform} className="rounded-full border border-white/15 px-3 py-0.5 text-xs uppercase tracking-[0.3em]">
                  {platform}
                </span>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-white/40">
            Source: {isLive ? "Live spreadsheet" : "Fallback snapshot"} {isLive ? "" : "(update CSV to refresh live data)"}
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <h2 className="text-xl font-semibold text-white">Snapshot</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Stat label="Payout split" value={formatPercent(selected.payoutPct)} />
            {fundingDisplay ? <Stat label={fundingDisplay.label} value={fundingDisplay.value} /> : null}
            <Stat
              label="Featured account size"
              value={formatCurrency(featuredAccountSize ?? selected.accountSize)}
            />
            <Stat
              label="Min days (Eval)"
              value={selected.minDays === 0 ? "Instant" : selected.minDays ? `${selected.minDays}` : "-"}
            />
            <Stat label="Days to payout" value={selected.daysToPayout ? String(selected.daysToPayout) : "-"} />
            <Stat label="Drawdown type" value={selected.drawdownType ?? "-"} />
            <Stat label="Spreads" value={selected.spreads ?? "-"} />
            <Stat
              label="Trustpilot"
              value={typeof selected.trustpilot === "number" ? selected.trustpilot.toFixed(1) : "-"}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-semibold text-white">Rules snapshot</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <RuleChip label="Fee refund" active={Boolean(selected.feeRefund)} />
            {typeof selected.newsTradingEval === "boolean" || typeof selected.newsTradingFunded === "boolean" ? (
              <>
                {typeof selected.newsTradingEval === "boolean" ? (
                  <RuleChip label={`News (Eval: ${selected.newsTradingEval ? "Yes" : "No"})`} active={Boolean(selected.newsTradingEval)} />
                ) : null}
                {typeof selected.newsTradingFunded === "boolean" ? (
                  <RuleChip label={`News (Funded: ${selected.newsTradingFunded ? "Yes" : "No"})`} active={Boolean(selected.newsTradingFunded)} />
                ) : null}
              </>
            ) : (
              <RuleChip label="News trading" active={Boolean(selected.newsTrading)} />
            )}
            <RuleChip label="Weekend holding" active={Boolean(selected.weekendHolding)} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Pricing & discounts</h2>
            {selected.discount?.code ? (
              <a
                href={affiliateUrl}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="rounded-full border border-amber-300/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200 transition hover:border-amber-200 hover:text-white"
              >
                Code: {selected.discount.code}
              </a>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Stat label="Evaluation fee" value={formatCurrency(selected.pricing?.evalCost ?? selected.pricing?.evalFee)} />
            <Stat label="Activation fee" value={formatCurrency(selected.pricing?.activationFee)} />
            <Stat label="True cost" value={formatCurrency(costs.trueCost)} />
            <Stat label="After discount" value={formatCurrency(costs.evalAfterDiscount)} />
          </div>
          {selected.discount?.label || selected.discount?.percent ? (
            <p className="text-sm text-amber-200/80">
              {selected.discount?.label ?? "Limited promo"}{" "}
              {selected.discount?.percent ? `(${selected.discount.percent}% off)` : ""}{" "}
              {selected.discount?.expires ? `· Expires ${selected.discount.expires}` : ""}
            </p>
          ) : (
            <p className="text-sm text-white/60">No official discount is currently listed in the spreadsheet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.35em] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function RuleChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active ? "bg-emerald-300/20 text-emerald-100" : "border border-white/15 text-white/50"
      }`}
    >
      {label}
    </span>
  );
}
