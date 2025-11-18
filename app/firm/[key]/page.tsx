"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { getCosts } from "@/lib/pricing";
import { FIRMS } from "@/lib/firms";
import { useFirms } from "@/lib/useFirms";

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
  minDays?: number | null;
  daysToPayout?: number | string | null;
  drawdownType?: string | null;
  spreads?: string | null;
  trustpilot?: number | null;
  feeRefund?: boolean;
  newsTrading?: boolean;
  weekendHolding?: boolean;
  pricing?: any;
  discount?: any;
};

function normalizeArray(input: unknown): string[] {
  if (Array.isArray(input)) return input.filter(Boolean).map((item) => String(item));
  if (typeof input === "string" && input.trim()) return [input.trim()];
  return [];
}

function normalizePricing(pricing: any | null | undefined) {
  if (!pricing) return null;
  const evalCost =
    pricing.evalCost ??
    pricing.evalFee ??
    pricing.eval_fee ??
    pricing.eval ??
    pricing.cost ??
    null;
  const activationFee =
    pricing.activationFee ?? pricing.activation_fee ?? pricing.activation ?? null;
  return {
    evalCost: typeof evalCost === "number" ? evalCost : undefined,
    activationFee: typeof activationFee === "number" ? activationFee : undefined,
    discount: pricing.discount ?? null,
    discountPct: pricing.discountPct ?? pricing.discount_pct ?? undefined,
  };
}

function normalizeFirmRow(row: any | null | undefined): FirmProfile | null {
  if (!row) return null;
  const payoutSplit = typeof row.payoutSplit === "number" ? row.payoutSplit : null;
  const payout =
    typeof row.payout === "number"
      ? row.payout * (row.payout <= 1 ? 100 : 1)
      : payoutSplit != null
      ? payoutSplit
      : null;
  const normalizedPricing = normalizePricing(row.pricing);

  return {
    key: row.key,
    name: row.name,
    logo: row.logo ?? (row.key ? `/logos/${row.key}.png` : null),
    homepage: row.homepage ?? row.url ?? null,
    signup: row.signup ?? row.url ?? null,
    notes: row.notes ?? null,
    model: normalizeArray(row.model),
    platforms: normalizeArray(row.platforms),
    payoutPct: typeof payout === "number" ? Math.round(payout) : null,
    maxFunding: typeof row.maxFunding === "number" ? row.maxFunding : null,
    accountSize: typeof row.accountSize === "number" ? row.accountSize : row.maxFunding ?? null,
    minDays: typeof row.minDays === "number" ? row.minDays : null,
    daysToPayout: row.daysToPayout ?? row.days_to_payout ?? null,
    drawdownType: row.drawdownType ?? row.drawdown_type ?? null,
    spreads: row.spreads ?? null,
    trustpilot: typeof row.trustpilot === "number" ? row.trustpilot : null,
    feeRefund: Boolean(row.feeRefund),
    newsTrading: Boolean(row.newsTrading),
    weekendHolding: Boolean(row.weekendHolding),
    pricing: normalizedPricing,
    discount: normalizedPricing?.discount ?? row.discount ?? null,
  };
}

function normalizeStaticFirm(row: any | null | undefined): FirmProfile | null {
  if (!row) return null;
  const normalizedPricing = normalizePricing(row.pricing);
  return {
    key: row.key,
    name: row.name,
    logo: row.logo ?? (row.key ? `/logos/${row.key}.png` : null),
    homepage: row.homepage ?? null,
    signup: row.signup ?? null,
    notes: row.notes ?? null,
    model: normalizeArray(row.model),
    platforms: normalizeArray(row.platforms),
    payoutPct:
      typeof row.payout === "number"
        ? Math.round(row.payout * (row.payout <= 1 ? 100 : 1))
        : null,
    maxFunding: typeof row.maxFunding === "number" ? row.maxFunding : null,
    accountSize: typeof row.accountSize === "number" ? row.accountSize : row.maxFunding ?? null,
    minDays: typeof row.minDays === "number" ? row.minDays : null,
    daysToPayout: row.daysToPayout ?? null,
    drawdownType: row.drawdownType ?? null,
    spreads: row.spreads ?? null,
    trustpilot: typeof row.trustpilot === "number" ? row.trustpilot : null,
    feeRefund: Boolean(row.feeRefund),
    newsTrading: Boolean(row.newsTrading),
    weekendHolding: Boolean(row.weekendHolding),
    pricing: normalizedPricing,
    discount: normalizedPricing?.discount ?? row.discount ?? null,
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
  const firmKey = (params?.key as string)?.toLowerCase() ?? "";
  const { firms, isLive, loading } = useFirms();

  const csvFirm = Array.isArray(firms) ? firms.find((row) => row.key === firmKey) : null;
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
            <Stat label="Max funding" value={formatCurrency(selected.maxFunding)} />
            <Stat label="Featured account size" value={formatCurrency(selected.accountSize)} />
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
            <RuleChip label="News trading" active={Boolean(selected.newsTrading)} />
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
