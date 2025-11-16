"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";

import HeroBanner from "@/components/HeroBanner";
import HomeViewToggle from "@/app/HomeViewToggle";

import { useFirms } from "@/lib/useFirms";
import { getCosts } from "@/lib/pricing";
import { FIRMS } from "@/lib/firms";
import { buildAffiliateUrl } from "@/lib/affiliates";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ExternalLink, Info, LinkIcon, Search, Star } from "lucide-react";

/**
 * MadProps — Prop Firm Affiliate Comparison (Home Page)
 * Table is the default view; toggle to cards with filters.
 */

const MODELS = ["Instant", "1-Phase", "2-Phase", "Scaling"] as const;
const PLATFORMS = ["MT4", "MT5", "cTrader", "TradingView", "Rithmic", "NinjaTrader"] as const;
const ACCOUNT_SIZE_OPTIONS = [
  "",
  "5000",
  "10000",
  "25000",
  "50000",
  "75000",
  "100000",
  "150000",
  "200000",
  "250000",
  "300000",
] as const;
const DRAW_DOWN_OPTIONS = ["EOD", "EOT TRAILING", "INTRADAY", "STATIC"] as const;
const PAYOUT_SPEED_PRESETS = [
  { value: "", label: "Any", max: null },
  { value: "fast7", label: "≤7 days (Fast)", max: 7 },
  { value: "fast14", label: "≤14 days", max: 14 },
  { value: "fast30", label: "≤30 days", max: 30 },
] as const;
const SCORE_FOCUS_PRESETS = [
  { value: "payout", label: "High payout" },
  { value: "trust", label: "Trusted" },
  { value: "funding", label: "Max funding" },
  { value: "cost", label: "Low cost" },
  { value: "payoutspeed", label: "Fast payouts" },
  { value: "refund", label: "Refundable" },
  { value: "drawdown", label: "Flexible drawdown" },
  { value: "discount", label: "Has discount" },
  { value: "evalspeed", label: "Quick eval" },
] as const;
type ScoreCriterion = (typeof SCORE_FOCUS_PRESETS)[number]["value"];
const DEFAULT_SCORE_FOCUS: ScoreCriterion[] = ["payout", "trust", "funding"];
type ModelType = (typeof MODELS)[number];
type PlatformType = (typeof PLATFORMS)[number];
type SortKey = "score" | "payout" | "cap" | "name" | "truecost";
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function parseDaysToNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/(\d+(\.\d+)?)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function resetAll(
  setters: {
    setQ: (v: string) => void;
    setModel: (v: any) => void;
    setPlatform: (v: any) => void;
    setMaxMinFunding: (v: number) => void;
    setMinPayout: (v: number) => void;
setSort: (v: SortKey) => void;
    setCompare: (v: string[]) => void;
  },
  router: any,
  pathname: string
) {
  const { setQ, setModel, setPlatform, setMaxMinFunding, setMinPayout, setSort, setCompare } =
    setters;

  setQ("");
  setModel("");
  setPlatform("");
  setMaxMinFunding(0);
  setMinPayout(70);
  setSort("score");
  setCompare([]);

  router.replace(pathname, { scroll: false });
}

const ALL_KEYS = new Set(FIRMS.map((f) => f.key));

function Toast({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-white px-3 py-2 text-sm shadow">
      {children}
    </div>
  );
}

function CopyLinkButton() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={copy} className="gap-2">
        <LinkIcon size={16} />
        Share this view
      </Button>
      <Toast show={copied}>Link copied to clipboard</Toast>
    </>
  );
}

export default function Page() {
  const { firms, loading, isLive, error } = useFirms();

  // ===== Normalize API -> UI shape =====
  type UIFirm = {
    key: string;
    name: string;
    model: string[];
    platforms: string[];
    payout: number | null;
    payoutPct: number | null;
    maxFunding: number | null;
    accountSize?: number | null;
    drawdownType?: string | null;
    drawdownTokens?: string[];
    daysToPayout?: number | string | null;
    payoutDaysValue?: number | null;
    logo?: string | null;
    homepage?: string | null;
    signup?: string | null;
    trustpilot?: number | null;
    pricing?: any;
    discount?: { label?: string; percent?: number; code?: string } | null;
    minDays?: number | null;
    spreads?: string | null;
    feeRefund?: boolean | null;
    newsTrading?: boolean | null;
    weekendHolding?: boolean | null;
  };

  const nFirms: UIFirm[] = useMemo(() => {
    const list = Array.isArray(firms) ? firms : [];
    return list.map((f: any) => {
      const payoutSplit = typeof f.payoutSplit === "number" ? f.payoutSplit : null;
      const payout = payoutSplit != null ? payoutSplit / 100 : null;

      const modelArray = Array.isArray(f.model)
        ? f.model.filter(Boolean)
        : f.model
        ? [String(f.model)]
        : [];

      const daysToPayoutRaw = f.daysToPayout ?? f.days_to_payout ?? null;
      return {
        key: f.key,
        name: f.name,
        model: modelArray,
        platforms: Array.isArray(f.platforms) ? f.platforms.filter(Boolean) : [],
        payout,
        payoutPct: payout != null ? Math.round(payout * 100) : null,
        maxFunding: typeof f.maxFunding === "number" ? f.maxFunding : null,
        accountSize: typeof f.accountSize === "number" ? f.accountSize : f.maxFunding ?? null,
        drawdownType: typeof f.drawdownType === "string" ? f.drawdownType : f.drawdown_type ?? null,
        drawdownTokens: Array.isArray(f.drawdownTokens) ? f.drawdownTokens : [],
        daysToPayout: daysToPayoutRaw,
        payoutDaysValue: parseDaysToNumber(daysToPayoutRaw),

        logo: f.logo ?? (f.key ? `/logos/${f.key}.png` : null),

        homepage: f.homepage ?? f.url ?? null,
        signup: f.signup ?? f.url ?? null,

        trustpilot: typeof f.trustpilot === "number" ? f.trustpilot : 0,
        pricing: f.pricing ?? null,
        discount: f.discount ?? null,
        minDays: f.minDays ?? null,
        spreads: f.spreads ?? null,
        feeRefund: !!f.feeRefund,
        newsTrading: !!f.newsTrading,
        weekendHolding: !!f.weekendHolding,
      };
    });
  }, [firms]);

  const firmNameOptions = useMemo(() => {
    const seen = new Set<string>();
    return nFirms
      .map((firm) => (firm.name ?? "").trim())
      .filter((name) => {
        if (!name) return false;
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
  }, [nFirms]);

  const usingLiveData = isLive;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ===== state =====
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [model, setModel] = useState<ModelType | "">("");
  const [platform, setPlatform] = useState<PlatformType | "">("");
const [maxMinFunding, setMaxMinFunding] = useState<number>(0);
const [minPayout, setMinPayout] = useState<number>(70);
  const [accountSizeFilter, setAccountSizeFilter] = useState<string>("");
  const [drawdownFilter, setDrawdownFilter] = useState<string>("");
  const [payoutSpeedFilter, setPayoutSpeedFilter] = useState<string>("");
  const [oneDayEvalOnly, setOneDayEvalOnly] = useState(false);
  const [refundOnly, setRefundOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [minTrust, setMinTrust] = useState<number>(0);
  const [scoreFocus, setScoreFocus] = useState<ScoreCriterion[]>([...DEFAULT_SCORE_FOCUS]);
  const [fireDealsMode, setFireDealsMode] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
const [sort, setSort] = useState<SortKey>("score");

  const doReset = () => {
    resetAll(
      { setQ, setModel, setPlatform, setMaxMinFunding, setMinPayout, setSort, setCompare },
      router,
      pathname
    );
    setSearchDraft("");
    setAccountSizeFilter("");
    setDrawdownFilter("");
    setPayoutSpeedFilter("");
    setOneDayEvalOnly(false);
    setRefundOnly(false);
    setDiscountOnly(false);
    setMinTrust(0);
    setScoreFocus([...DEFAULT_SCORE_FOCUS]);
    setFireDealsMode(false);
  };

  // ===== read from URL =====
  useEffect(() => {
    const sp = searchParams;

    const nextQ = sp.get("q") ?? "";
    const nextModel = sp.get("model") ?? "";
    const nextPlatform = sp.get("platform") ?? "";
    const nextCap = Number(sp.get("cap") ?? "0");
    const nextPayout = Number(sp.get("payout") ?? "0");
const nextSort = (sp.get("sort") ?? "score") as SortKey;    const nextCompareRaw = sp.get("compare") ?? "";
    const nextCompare =
      nextCompareRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((k) => ALL_KEYS.has(k)) || [];

    const safeModel = (MODELS as readonly string[]).includes(nextModel)
      ? (nextModel as ModelType)
      : "";
    const safePlatform = (PLATFORMS as readonly string[]).includes(nextPlatform)
      ? (nextPlatform as PlatformType)
      : "";
    const safeCap = Number.isFinite(nextCap) ? clamp(nextCap, 0, 1_000_000) : 0;
    const safePayout = Number.isFinite(nextPayout) ? clamp(nextPayout, 0, 100) : 0;
const allowedSorts = ["score", "payout", "cap", "name", "truecost"] as const;
const safeSort: SortKey = (allowedSorts as readonly string[]).includes(nextSort)
  ? (nextSort as SortKey)
  : "score";
    setQ((prev) => (prev === nextQ ? prev : nextQ));
    setModel((prev) => (prev === safeModel ? prev : (safeModel as any)));
    setPlatform((prev) => (prev === safePlatform ? prev : (safePlatform as any)));
    setMaxMinFunding((prev) => (prev === safeCap ? prev : safeCap));
    setMinPayout((prev) => (prev === safePayout ? prev : safePayout));
    setSort((prev) => (prev === safeSort ? prev : safeSort));
    setCompare((prev) =>
      prev.length === nextCompare.length && prev.every((v, i) => v === nextCompare[i])
        ? prev
        : nextCompare
    );
  }, [searchParams]);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  // ===== write to URL =====
  const debouncedCap = useDebounced(maxMinFunding, 200);
  const debouncedPayout = useDebounced(minPayout, 200);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, val: string | number | "" | null | undefined) => {
      if (val === "" || val === null || typeof val === "undefined") sp.delete(key);
      else sp.set(key, String(val));
    };

    setOrDelete("q", q.trim());
    setOrDelete("model", model);
    setOrDelete("platform", platform);
    setOrDelete("cap", debouncedCap || 0);
    setOrDelete("payout", debouncedPayout || 70);
    setOrDelete("sort", sort);

    if (compare.length > 0) sp.set("compare", compare.join(","));
    else sp.delete("compare");

    const next = `${pathname}?${sp.toString()}`;
    const current = `${pathname}?${searchParams.toString()}`;
    if (next !== current) router.replace(next, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, model, platform, debouncedCap, debouncedPayout, sort, compare, pathname, router]);

  // ===== filtering & sorting =====
  type ScoredFirm = UIFirm & { score: number };

  const filtered: UIFirm[] = useMemo(() => {
    const ql = q.toLowerCase();
    const payoutPreset = PAYOUT_SPEED_PRESETS.find((preset) => preset.value === payoutSpeedFilter);
    const payoutMax = payoutPreset?.max ?? null;
    return (nFirms ?? []).filter((f) => {
      const nameOk = !q || (f.name || "").toLowerCase().includes(ql);
      const modelOk = !model || (f.model || []).includes(model);
      const platformsOk = !platform || (f.platforms || []).includes(platform);
      const fundingOk = (f.maxFunding ?? 0) >= (maxMinFunding ?? 0);
      const splitOk = (f.payoutPct ?? 0) >= (minPayout ?? 0);
      const accountOk =
        !accountSizeFilter || Math.round(f.accountSize ?? 0) === Number(accountSizeFilter);
      const drawdownOk =
        !drawdownFilter ||
        (f.drawdownType || "").toLowerCase().includes(drawdownFilter.toLowerCase());
      const payoutSpeedOk =
        !payoutSpeedFilter ||
        ((f.payoutDaysValue ?? Number.POSITIVE_INFINITY) <= (payoutMax ?? Number.POSITIVE_INFINITY));
      const evalSpeedOk = !oneDayEvalOnly || (f.minDays ?? Number.POSITIVE_INFINITY) <= 1;
      const refundOk = !refundOnly || !!f.feeRefund;
      const discountValue =
        f.discount?.percent ?? f.discount?.amount ?? f.pricing?.discountPct ?? 0;
      const discountOk = !discountOnly || Number(discountValue) > 0;
      const fireDealOk = !fireDealsMode || Number(discountValue) > 0;
      const trustOk = (f.trustpilot ?? 0) >= (minTrust ?? 0);
      return (
        nameOk &&
        modelOk &&
        platformsOk &&
        fundingOk &&
        splitOk &&
        accountOk &&
        drawdownOk &&
        payoutSpeedOk &&
        evalSpeedOk &&
        refundOk &&
        discountOk &&
        fireDealOk &&
        trustOk
      );
    });
  }, [
    nFirms,
    q,
    model,
    platform,
    maxMinFunding,
    minPayout,
    accountSizeFilter,
    drawdownFilter,
    payoutSpeedFilter,
    oneDayEvalOnly,
    refundOnly,
    discountOnly,
    fireDealsMode,
    minTrust,
  ]);

  const scored: ScoredFirm[] = useMemo(() => {
    const appliedFocus: ScoreCriterion[] = scoreFocus.length
      ? scoreFocus
      : [...DEFAULT_SCORE_FOCUS];
    const costCache = new Map<string, number>();
    const getTrueCost = (firm: UIFirm) => {
      if (costCache.has(firm.key)) return costCache.get(firm.key)!;
      const value = getCosts(firm as any).trueCost;
      costCache.set(firm.key, value);
      return value;
    };
    const scoreForCriterion = (f: UIFirm, criterion: ScoreCriterion) => {
      switch (criterion) {
        case "payout":
          return (f.payout ?? 0) * 100;
        case "trust":
          return ((f.trustpilot ?? 0) / 5) * 100;
        case "funding":
          return Math.min((f.maxFunding ?? 0) / 1000, 100);
        case "cost": {
          const cost = getTrueCost(f);
          if (!Number.isFinite(cost) || cost <= 0) return 50;
          return Math.max(0, 100 - Math.min(cost / 50, 100));
        }
        case "payoutspeed": {
          const days = f.payoutDaysValue ?? 45;
          const clamped = Math.min(Math.max(days, 0), 45);
          return ((45 - clamped) / 45) * 100;
        }
        case "refund":
          return f.feeRefund ? 100 : 40;
        case "drawdown":
          return (f.drawdownType || "").toLowerCase().includes("static") ? 100 : 60;
        case "discount": {
          const discountValue =
            f.discount?.percent ?? f.discount?.amount ?? f.pricing?.discountPct ?? 0;
          return Number(discountValue) > 0 ? 100 : 40;
        }
        case "evalspeed": {
          const min = f.minDays ?? Number.POSITIVE_INFINITY;
          if (!Number.isFinite(min)) return 40;
          if (min <= 1) return 100;
          if (min <= 3) return 80;
          if (min <= 5) return 60;
          return 40;
        }
        default:
          return 0;
      }
    };

    return filtered
      .map((f) => {
        const scoreTotal =
          appliedFocus.reduce((sum, criterion) => sum + scoreForCriterion(f, criterion), 0) /
          appliedFocus.length;
        return { ...f, score: Math.round(scoreTotal) };
      })
      .sort((a, b) => {
        if (sort === "payout") return (b.payout ?? 0) - (a.payout ?? 0);
        if (sort === "cap") return (b.maxFunding ?? 0) - (a.maxFunding ?? 0);
        if (sort === "name") return (a.name || "").localeCompare(b.name || "");
        if (sort === "truecost") {
          const ca = getTrueCost(a);
          const cb = getTrueCost(b);
          return ca - cb;
        }
        return (b.score ?? 0) - (a.score ?? 0);
      });
  }, [filtered, scoreFocus, sort]);

  const selected = scored.filter((f) => compare.includes(f.key));
type UIFirmWithConn = UIFirm & {
  platformFeeds?: Record<string, string[]>;
  dataFeeds?: string[];
};

// Build a single, human string for “Trading platform / connection”
function platformConnectionsText(f: UIFirmWithConn): string {
  const items: string[] = [];

  const platforms = Array.isArray(f.platforms) ? f.platforms : [];
  const feeds = Array.isArray(f.dataFeeds) ? f.dataFeeds : [];

  // Platforms with “via …”
  platforms.forEach((p) => {
    const via = f.platformFeeds?.[p];
    if (Array.isArray(via) && via.length > 0) {
      items.push(`${p} (via ${via.join("/")})`);
    } else {
      items.push(p);
    }
  });

  // Any feeds that weren’t already mentioned via a platform
  const coveredFeeds = new Set(
    Object.values(f.platformFeeds ?? {}).flatMap((arr) => arr ?? [])
  );
  feeds.forEach((df) => {
    if (!coveredFeeds.has(df)) items.push(df);
  });

  // De-dupe while preserving order
  return Array.from(new Set(items)).join(", ");
}

  // ===== JSON-LD =====
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Prop Firm Comparison Directory",
    description:
      "Compare proprietary trading firms: evaluation models, payout splits, max funding, platforms, and rules. Includes affiliate discounts.",
    itemListElement: scored.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Organization",
        name: f.name,
        url: f.homepage,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: f.trustpilot ?? 0,
          ratingCount: Math.round(100 * ((f.trustpilot ?? 0) / 5)),
        },
      },
    })),
  };

  if (loading) return <main className="p-6">Loading…</main>;
  if (error) return <main className="p-6">Failed to load firms</main>;

  // ===== Cards view =====
  const HomeCards = (
    <>
      {scored.length === 0 && (
        <p className="text-sm text-white/50 mt-2">No matching firms. Try clearing filters.</p>
      )}

      {/* Controls */}
      <section className="surface rounded-2xl p-3 md:p-4 shadow-sm grid items-end gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Search size={16} /> Search firms
          </label>
          <form
            className="mt-1 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setQ(searchDraft);
            }}
          >
            <Input
              placeholder="Search by name…"
              list="home-firm-search-options"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="flex-1"
            />
            <datalist id="home-firm-search-options">
              {firmNameOptions
                .filter((name) => {
                  const drafted = searchDraft.trim().toLowerCase();
                  if (!drafted) return false;
                  return name.toLowerCase().startsWith(drafted);
                })
                .map((name) => (
                  <option key={name} value={name} />
                ))}
            </datalist>
            <Button type="submit" size="sm">
              Search
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={() => {
                setSearchDraft("");
                setQ("");
              }}
            >
              Clear
            </Button>
          </form>
        </div>

        <div className="md:col-span-3">
          <label className="text-sm font-medium">Model</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <FilterChips options={["", ...MODELS]} value={model} onChange={(v) => setModel(v as any)} />
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="text-sm font-medium">Platform</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <FilterChips options={["", ...PLATFORMS]} value={platform} onChange={(v) => setPlatform(v as any)} />
          </div>
        </div>

        <div className="md:col-span-6">
          <label className="flex justify-between text-sm font-medium">
            <span>Minimum Max Funding</span>
            <span className="tabular-nums">${maxMinFunding.toLocaleString()}</span>
          </label>
<Slider
  min={0}
  max={1_000_000}
  step={50_000}
  value={[maxMinFunding]}
  onValueChange={([v = 0]) => setMaxMinFunding(v)}
/>
        </div>

        <div className="md:col-span-6">
          <label className="flex justify-between text-sm font-medium">
            <span>Minimum Payout Split</span>
            <span className="tabular-nums">{minPayout}%</span>
          </label>
<Slider
  min={50}
  max={100}
  step={5}
  value={[minPayout]}
  onValueChange={([v = 70]) => setMinPayout(v)}
/>
        </div>

        <div className="md:col-span-12 flex items-center gap-2">
          <label className="text-sm font-medium">Sort by</label>
<FilterChips
  options={["score", "payout", "cap", "name", "truecost"]}
  value={sort}
  onChange={(v) => setSort(v as any)}
/>

          {(q || model || platform || maxMinFunding > 0 || minPayout !== 70 || sort !== "score" || compare.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={doReset}
              className="ml-auto"
              title="Reset search, filters, sliders, sort, and compare"
            >
              Reset filters
            </Button>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      {/* Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scored.map((f, idx) => {
          const cost = getCosts(f as any);
          return (
            <Card
              key={`${f.key}-${idx}`}
              className="rounded-2xl surface elevated border border-amber-300/15 hover:border-amber-300/35 shadow-sm transition-all"
            >
              <CardContent className="space-y-3 p-4">
                {/* header row: logo + discount badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {f.logo ? (
                      <Image
                        src={f.logo}
                        alt={`${f.name} logo`}
                        width={160}
                        height={60}
                        className="h-12 w-auto rounded bg-white/5"
                        unoptimized
                        onError={(e) => {
                          const el = e.currentTarget as HTMLImageElement;
                          el.style.display = "none";
                          const fallback = document.createElement("div");
                          fallback.className =
                            "h-12 w-40 rounded bg-white/10 flex items-center justify-center text-xs text-white/60";
                          fallback.textContent = (f.name ?? "?")
                            .split(/\s+/)
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                          el.parentElement?.appendChild(fallback);
                        }}
                      />
                    ) : (
                      <div className="h-12 w-40 rounded bg-white/10 flex items-center justify-center text-xs text-white/50">
                        No logo
                      </div>
                    )}
                  </div>

                  {cost.discountPct > 0 ? (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-300 border border-amber-300/30">
                      {cost.discountPct}% OFF{f.discount?.code ? ` • ${f.discount.code}` : ""}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-white/5 text-white/60 border border-white/10">
                      No promo
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-semibold leading-snug">
                  <Link
                    href={{
                      pathname: `/firm/${f.key}`,
                      query: Object.fromEntries(searchParams.entries()),
                    }}
                    className="hover:underline"
                  >
                    {f.name}
                  </Link>
                </h2>

                <div className="flex flex-wrap gap-2">
                  {(f.model ?? []).map((m: string) => (
                    <Badge key={`m-${m}`} className="transition-colors duration-200 hover:border-emerald-400 hover:text-emerald-500">
                      {m}
                    </Badge>
                  ))}
                  {(f.platforms ?? []).map((p: string) => (
                    <Badge key={`p-${p}`} variant="outline" className="transition-colors duration-200 hover:border-emerald-400 hover:text-emerald-500">
                      {p}
                    </Badge>
                  ))}
                </div>

<ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
  <li>
    <strong>True cost:</strong> ${cost.trueCost.toLocaleString()}
  </li>
                <li>
                  <strong>Up-front:</strong> ${cost.evalAfterDiscount.toLocaleString()}
                </li>
                <li>
                  <strong>Activation:</strong> ${Number(f.pricing?.activationFee ?? 0).toLocaleString()}
                </li>
  {f.discount && cost.discountPct > 0 && (
    <li className="col-span-2 text-xs font-medium text-amber-300">
      💸 {f.discount.label || "Promo"} ({cost.discountPct}% off)
      {f.discount?.code && (
        <span className="text-muted-foreground"> — code: {f.discount.code}</span>
      )}
    </li>
  )}
  <li>
    <strong>Payout:</strong> {(f.payoutPct ?? 0)}%
  </li>
  <li>
    <strong>Max funding:</strong> ${f.maxFunding?.toLocaleString() ?? "—"}
  </li>
  <li>
    <strong>Min days:</strong> {f.minDays ?? "—"}
  </li>
  <li className="col-span-2">
    <strong>Spreads:</strong> {f.spreads ?? "—"}
  </li>
  <li>
    <strong>Refund:</strong> {f.feeRefund ? "Yes" : "No"}
  </li>
  <li>
    <strong>News trading:</strong> {f.newsTrading ? "Allowed" : "Restricted"}
  </li>
  <li>
    <strong>Weekend hold:</strong> {f.weekendHolding ? "Yes" : "No"}
  </li>
                  <li className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400" />
                    <Badge
                      variant="outline"
                      className={
                        (f.trustpilot ?? 0) >= 4.5
                          ? "border-green-500 bg-green-50 text-green-600"
                          : (f.trustpilot ?? 0) >= 3.5
                          ? "border-yellow-500 bg-yellow-50 text-yellow-600"
                          : "border-red-500 bg-red-50 text-red-600"
                      }
                    >
                      {(f.trustpilot ?? 0).toFixed(1)}
                    </Badge>
                  </li>
                </ul>

                {/* actions */}
                <div className="flex gap-2">
                  {f.homepage && (
                    <a href={f.homepage} target="_blank" rel="nofollow noopener" className="w-full">
                      <Button className="w-full border-2 border-transparent bg-white/5 hover:bg-white/10">
                        <ExternalLink className="mr-2" size={16} />
                        Website
                      </Button>
                    </a>
                  )}

                  <a
                    href={buildAffiliateUrl(f.signup ?? f.homepage ?? "#", f.key)}
                    target="_blank"
                    rel={f.signup ? "nofollow sponsored noopener" : "nofollow noopener"}
                    className="w-full"
                  >
                    <Button className="w-full border-2 border-transparent transition-all duration-300 hover:border-[#5fffc2] hover:shadow-[0_0_12px_#5fffc2aa]">
                      Get Started
                    </Button>
                  </a>
                </div>

                {/* compare + (optional) affiliate preview */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-black"
                      checked={compare.includes(f.key)}
                      onChange={(e) =>
                        setCompare((prev) =>
                          e.target.checked ? [...prev, f.key] : prev.filter((k) => k !== f.key)
                        )
                      }
                    />
                    Compare
                  </label>

                  {f.signup && (
                    <a
                      href={buildAffiliateUrl(f.signup, f.key)}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      className="text-xs underline"
                    >
                      Affiliate link preview
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Compare table (only for cards view) */}
      {selected.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xl font-semibold">Compare selected</h3>
          <div className="overflow-auto">
            <table className="w-full rounded-lg border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Firm</th>
                  <th className="p-2 text-left">Model</th>
                  <th className="p-2 text-left">Platforms</th>
                  <th className="p-2 text-left">Payout</th>
                  <th className="p-2 text-left">Max Funding</th>
                  <th className="p-2 text-left">Min Days</th>
                  <th className="p-2 text-left">Rules</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((f, idx) => (
                  <tr key={`cmp-${f.key}-${idx}`} className="border-t">
                    <td className="p-2 font-medium">{f.name}</td>
                    <td className="p-2">{f.model.join(", ")}</td>
                    <td className="p-2">{f.platforms.join(", ")}</td>
                    <td className="p-2">{Math.round((f.payout ?? 0) * 100)}%</td>
                    <td className="p-2">${(f.maxFunding ?? 0).toLocaleString()}</td>
                    <td className="p-2">{f.minDays ?? "—"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">News: {f.newsTrading ? "OK" : "No"}</Badge>
                        <Badge variant="outline">Weekend: {f.weekendHolding ? "OK" : "No"}</Badge>
                        <Badge variant="outline">Refund: {f.feeRefund ? "Yes" : "No"}</Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );

  return (
    <main>
      <HeroBanner />

      <div className="container mx-auto max-w-6xl p-6 space-y-6">
        <Script id="ld-json" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        {/* Top disclosure */}
        <AffiliateNotice />

        {/* Toggle: default view = Table; switch to Cards with ?view=cards */}
        <HomeViewToggle cards={HomeCards} firms={firms} />

        <FAQ />
        <Footer />
      </div>

      {/* Live data indicator */}
      {usingLiveData ? (
        <div className="fixed bottom-3 right-3 z-50 rounded-md bg-emerald-500/20 px-3 py-1.5 text-emerald-400 text-xs font-medium border border-emerald-400/30 backdrop-blur-sm">
          ● Live data
        </div>
      ) : (
        <div className="fixed bottom-3 right-3 z-50 rounded-md bg-amber-500/20 px-3 py-1.5 text-amber-400 text-xs font-medium border border-amber-400/30 backdrop-blur-sm">
          ⚠️ Using fallback
        </div>
      )}
    </main>
  );
}

/* ===== helper components ===== */

function FilterChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const label = opt === "" ? "All" : opt;
        const active = value === opt;
        return (
          <Button
            key={label}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(opt)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

function AffiliateNotice() {
  return (
    <div className="notice-fade w-full text-[11px] md:text-xs text-white/50 mt-[4px] mb-2 flex items-start gap-1.5 leading-snug px-4 whitespace-nowrap overflow-hidden text-ellipsis">
      <Info size={12} className="mt-0.5 shrink-0 text-white/40" />
      <p className="truncate">
        <span className="font-medium text-white/60">Disclosure:</span>{" "}
        Some links on this page are affiliate links. Signing up through them may earn us a small commission at no extra
        cost to you.
      </p>
    </div>
  );
}

function FAQ() {
  const qa = [
    {
      q: "How do affiliate codes work on this site?",
      a: "All signup buttons use a central code map. Update the code once in AFFILIATE_CODES and every link refreshes automatically.",
    },
    {
      q: "Are these rankings financial advice?",
      a: "No. We provide research and comparisons for educational purposes only. Trading involves risk.",
    },
  ];
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">FAQ</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {qa.map((item, idx) => (
          <Card key={idx}>
            <CardContent className="space-y-2 p-4">
              <h4 className="font-medium">{item.q}</h4>
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="pt-8 text-sm text-muted-foreground">
      <hr className="my-4" />
      <p>© {new Date().getFullYear()} MadProps • Educational content only, not financial advice.</p>
      <p className="mt-1">
        Disclosure: <a className="underline" href="/disclosure">Affiliate links</a> •{" "}
        Contact: <a className="underline" href="mailto:hello@madprops.io">hello@madprops.io</a>
      </p>
    </footer>
  );
}
