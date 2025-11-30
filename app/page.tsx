"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";

import HeroBanner from "@/components/HeroBanner";
import HomeViewToggle from "@/app/HomeViewToggle";

import { useFirms } from "@/lib/useFirms";
import { useFavorites } from "@/lib/useFavorites";
import { getCosts } from "@/lib/pricing";
import { FIRMS } from "@/lib/firms";
import { MODEL_TAGS } from "@/lib/modelTags";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { formatStarIcons } from "@/lib/useStarRating";
import { formatFundingOrAccounts } from "@/lib/funding";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, Heart, Info, LinkIcon, Search, Star } from "lucide-react";

/**
 * MadProps — Prop Firm Affiliate Comparison (Home Page)
 * Table is the default view; toggle to cards with filters.
 */

const MODELS = MODEL_TAGS;
const FALLBACK_PLATFORMS = ["MT4", "MT5", "cTrader", "TradingView", "Rithmic", "NinjaTrader", "Tradovate"];
const POPULAR_PLATFORM_ORDER = [
  "TradingView",
  "MT5",
  "MT4",
  "cTrader",
  "Rithmic",
  "NinjaTrader",
  "Tradovate",
  "DXtrade",
] as const;
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
const MAX_FUNDING_PRESETS = [0, 50_000, 100_000, 200_000, 300_000, 500_000, 1_000_000] as const;
const DRAW_DOWN_OPTIONS = ["EOD", "EOT TRAILING", "INTRADAY", "STATIC"] as const;
const MIN_PAYOUT_PRESETS = [0, 50, 60, 70, 80, 90] as const;
const TRUST_OPTIONS = Array.from({ length: 11 }, (_, idx) => idx * 0.5) as readonly number[];
const PLATFORM_PREVIEW_FALLBACK_COUNT = 8;
const FIRE_DEAL_TRUST_MIN = 3;
const FIRE_DEAL_TRUECOST_MAX = 600;
const PAYOUT_SPEED_PRESETS = [
  { value: "", label: "Any", max: null },
  { value: "fast7", label: "<=7 days (Fast)", max: 7 },
  { value: "fast14", label: "<=14 days", max: 14 },
  { value: "fast30", label: "<=30 days", max: 30 },
] as const;
const SCORE_FOCUS_PRESETS = [
  { value: "payout", label: "High payout" },
  { value: "trust", label: "Trusted" },
  { value: "funding", label: "Max funding" },
  { value: "cost", label: "Low cost" },
  { value: "payoutspeed", label: "Fast payouts" },
  { value: "discount", label: "Has discount" },
  { value: "evalspeed", label: "Quick eval" },
] as const;
type ScoreCriterion = (typeof SCORE_FOCUS_PRESETS)[number]["value"];
const DEFAULT_SCORE_FOCUS: ScoreCriterion[] = ["payout", "trust", "funding"];
const FIRE_DEAL_SCORE_FOCUS: ScoreCriterion[] = ["cost", "discount", "trust"];
type ModelType = (typeof MODELS)[number];
type PlatformType = string;
type SortKey = "score" | "payout" | "cap" | "name" | "truecost";
const DEFAULT_MIN_PAYOUT = 0;
const DEFAULT_MIN_TRUST = 3;
const CARDS_PER_PAGE = 18;
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

function formatMinDaysDisplay(value?: number | null) {
  if (value === 0) return "Instant";
  if (typeof value === "number" && Number.isFinite(value)) return `${value}`;
  return "-";
}

function parseListParam(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => b[idx] === val);
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
    setPlatforms: (v: PlatformType[] | []) => void;
    setMaxMinFunding: (v: number) => void;
    setMinPayout: (v: number) => void;
    setSort: (v: SortKey) => void;
    setCompare: (v: string[]) => void;
  },
  router: any,
  pathname: string,
  options?: { view?: string | null }
) {
  const { setQ, setModel, setPlatforms, setMaxMinFunding, setMinPayout, setSort, setCompare } =
    setters;

  setQ("");
  setModel("");
  setPlatforms([]);
  setMaxMinFunding(0);
  setMinPayout(DEFAULT_MIN_PAYOUT);
  setSort("score");
  setCompare([]);

  const viewParam = options?.view;
  const nextUrl = viewParam ? `${pathname}?view=${viewParam}` : pathname;
  router.replace(nextUrl, { scroll: false });
}

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
    accountLabel?: string | null;
    model: string[];
    platforms: string[];
    payout: number | null;
    payoutPct: number | null;
    maxFunding: number | null;
    maxAccounts?: number | null;
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
    newsTradingEval?: boolean | null;
    newsTradingFunded?: boolean | null;
    weekendHolding?: boolean | null;
  };

  const formatNewsTrading = (f: UIFirm) => {
    const evalStatus =
      typeof f.newsTradingEval === "boolean" ? (f.newsTradingEval ? "Allowed" : "Restricted") : null;
    const fundedStatus =
      typeof f.newsTradingFunded === "boolean" ? (f.newsTradingFunded ? "Allowed" : "Restricted") : null;

    if (evalStatus || fundedStatus) {
      const parts = [];
      if (evalStatus) parts.push(`Eval: ${evalStatus}`);
      if (fundedStatus) parts.push(`Funded: ${fundedStatus}`);
      return parts.join(" / ");
    }

    if (typeof f.newsTrading === "boolean") {
      return f.newsTrading ? "Allowed" : "Restricted";
    }

    return "Unknown";
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
        accountLabel: f.accountLabel ?? null,
        model: modelArray,
        platforms: Array.isArray(f.platforms) ? f.platforms.filter(Boolean) : [],
        payout,
        payoutPct: payout != null ? Math.round(payout * 100) : null,
        maxFunding: typeof f.maxFunding === "number" ? f.maxFunding : null,
        maxAccounts: typeof f.maxAccounts === "number" ? f.maxAccounts : null,
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
        feeRefund: typeof f.feeRefund === "boolean" ? f.feeRefund : null,
        newsTrading: typeof f.newsTrading === "boolean" ? f.newsTrading : null,
        newsTradingEval: typeof f.newsTradingEval === "boolean" ? f.newsTradingEval : null,
        newsTradingFunded: typeof f.newsTradingFunded === "boolean" ? f.newsTradingFunded : null,
        weekendHolding: typeof f.weekendHolding === "boolean" ? f.weekendHolding : null,
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

  const platformOptions = useMemo(() => {
    const map = new Map<string, string>();
    const addPlatform = (value?: string | null) => {
      if (!value) return;
      const normalized = value.trim();
      if (!normalized) return;
      const dedupeKey = normalized.toLowerCase();
      if (!map.has(dedupeKey)) map.set(dedupeKey, normalized);
    };
    FALLBACK_PLATFORMS.forEach(addPlatform);
    (nFirms ?? []).forEach((firm) => {
      (firm.platforms ?? []).forEach((p) => addPlatform(p));
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [nFirms]);
  const platformPreviewList = useMemo(() => {
    if (!platformOptions.length) return [];
    const lookup = new Map(platformOptions.map((name) => [name.toLowerCase(), name]));
    const normalizedSeen = new Set<string>();
    const prioritized: string[] = [];
    POPULAR_PLATFORM_ORDER.forEach((label) => {
      const match = lookup.get(label.toLowerCase());
      if (!match) return;
      const key = match.toLowerCase();
      if (normalizedSeen.has(key)) return;
      normalizedSeen.add(key);
      prioritized.push(match);
    });
    if (prioritized.length === 0) {
      return platformOptions.slice(0, Math.min(PLATFORM_PREVIEW_FALLBACK_COUNT, platformOptions.length));
    }
    return prioritized;
  }, [platformOptions]);
  const usingLiveData = isLive;
  const { favorites, toggleFavorite, isFavorite, clearFavorites } = useFavorites();
  const favoriteFirms = useMemo(() => {
    return (nFirms ?? []).filter((firm) => favorites.includes(firm.key));
  }, [nFirms, favorites]);
  const compareKeyWhitelist = useMemo(() => {
    const keys = new Set<string>();
    FIRMS.forEach((firm) => {
      if (firm.key) keys.add(firm.key);
    });
    (firms ?? []).forEach((firm) => {
      if (firm?.key) keys.add(firm.key);
    });
    return keys;
  }, [firms]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const isCardsView = viewParam === "cards";

  // ===== state =====
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [model, setModel] = useState<ModelType | "">("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([]);
const [maxMinFunding, setMaxMinFunding] = useState<number>(0);
const [minPayout, setMinPayout] = useState<number>(DEFAULT_MIN_PAYOUT);
  const [accountSizeFilter, setAccountSizeFilter] = useState<string[]>([]);
  const [drawdownFilter, setDrawdownFilter] = useState<string>("");
  const [payoutSpeedFilter, setPayoutSpeedFilter] = useState<string>("");
  const [oneDayEvalOnly, setOneDayEvalOnly] = useState(false);
  const [instantFundedOnly, setInstantFundedOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [minTrust, setMinTrust] = useState<number>(DEFAULT_MIN_TRUST);
  const [scoreFocus, setScoreFocus] = useState<ScoreCriterion[]>([]);
  const [fireDealsMode, setFireDealsMode] = useState(false);
  const [tableFireDealsMode, setTableFireDealsMode] = useState(false);
  const [tableAccountSize, setTableAccountSize] = useState<string>("50000");
  const [tableFirmName, setTableFirmName] = useState<string>("");
  const [compare, setCompare] = useState<string[]>([]);
const [sort, setSort] = useState<SortKey>("score");
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [cardsPage, setCardsPage] = useState(1);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const fireDealsPrevFilters = useRef<{
    discountOnly: boolean;
    minTrust: number;
    scoreFocus: ScoreCriterion[];
  } | null>(null);

  const activateFireDeals = () => {
    if (fireDealsMode) return;
    fireDealsPrevFilters.current = {
      discountOnly,
      minTrust,
      scoreFocus: [...scoreFocus],
    };
    setFireDealsMode(true);
    setDiscountOnly(true);
    setMinTrust((current) => Math.max(current, FIRE_DEAL_TRUST_MIN));
    setScoreFocus([...FIRE_DEAL_SCORE_FOCUS]);
  };

  const deactivateFireDeals = () => {
    if (!fireDealsMode) return;
    const previous = fireDealsPrevFilters.current;
    setFireDealsMode(false);
    setDiscountOnly(previous ? previous.discountOnly : false);
    setMinTrust(previous ? previous.minTrust : DEFAULT_MIN_TRUST);
    if (previous?.scoreFocus?.length) setScoreFocus(previous.scoreFocus);
    else setScoreFocus([]);
    fireDealsPrevFilters.current = null;
  };

  const toggleFireDeals = () => {
    if (fireDealsMode) deactivateFireDeals();
    else activateFireDeals();
  };

  const toggleTableFireDeals = () => {
    setTableFireDealsMode((prev) => !prev);
  };

  const handleManualFilterChange = () => {
    if (fireDealsMode) deactivateFireDeals();
    setCardsPage(1);
  };

  const toggleFastPass = () => {
    handleManualFilterChange();
    setOneDayEvalOnly((prev) => {
      const next = !prev;
      if (next) setInstantFundedOnly(false);
      return next;
    });
  };

  const toggleInstantFunded = () => {
    handleManualFilterChange();
    setInstantFundedOnly((prev) => {
      const next = !prev;
      if (next) setOneDayEvalOnly(false);
      return next;
    });
  };

  const handleExportFavorites = () => {
    if (typeof window === "undefined" || favoriteFirms.length === 0) return;
    const header = [
      "Name",
      "Key",
      "Models",
      "Account Size",
      "Max Funding / Accounts",
      "Platforms",
      "Payout %",
      "True Cost",
      "Discount Code",
      "Website",
    ];
    const rows = favoriteFirms.map((firm) => {
      const cost = getCosts(firm as any);
      const fundingValue = formatFundingOrAccounts(firm.maxFunding, firm.maxAccounts)?.value ?? "";
      const values = [
        firm.name ?? "",
        firm.key ?? "",
        (firm.model ?? []).join(" / "),
        firm.accountSize ? `$${firm.accountSize.toLocaleString()}` : "",
        fundingValue,
        (firm.platforms ?? []).join(" / "),
        typeof firm.payoutPct === "number" ? `${firm.payoutPct}%` : "",
        `$${cost.trueCost.toLocaleString()}`,
        firm.discount?.code ?? "",
        firm.homepage ?? firm.signup ?? "",
      ];
      return values
        .map((val) => {
          const str = String(val ?? "");
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `madprops-favorites-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const doReset = () => {
    if (fireDealsMode) deactivateFireDeals();
    resetAll(
      { setQ, setModel, setPlatforms: setSelectedPlatforms, setMaxMinFunding, setMinPayout, setSort, setCompare },
      router,
      pathname,
      { view: searchParams.get("view") }
    );
    setSearchDraft("");
    setAccountSizeFilter([]);
    setDrawdownFilter("");
    setPayoutSpeedFilter("");
    setOneDayEvalOnly(false);
    setInstantFundedOnly(false);
    setDiscountOnly(false);
    setMinTrust(DEFAULT_MIN_TRUST);
    setScoreFocus([]);
    setShowAllPlatforms(false);
    setCardsPage(1);
    setFavoritesOnly(false);
    setTableAccountSize("50000");
    setTableFirmName("");
    fireDealsPrevFilters.current = null;
  };

  // ===== read from URL =====
  useEffect(() => {
    const sp = searchParams;

    const nextQ = sp.get("q") ?? "";
    const nextModel = sp.get("model") ?? "";
    const nextPlatformRaw = sp.get("platforms") ?? sp.get("platform") ?? "";
    const nextCap = Number(sp.get("cap") ?? "0");
    const nextPayoutRaw = sp.get("payout");
    const nextPayout = nextPayoutRaw === null ? DEFAULT_MIN_PAYOUT : Number(nextPayoutRaw);
const nextSort = (sp.get("sort") ?? "score") as SortKey;    const nextCompareRaw = sp.get("compare") ?? "";
    const nextCompare =
      nextCompareRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((k) => compareKeyWhitelist.has(k)) || [];

    const safeModel = (MODELS as readonly string[]).includes(nextModel)
      ? (nextModel as ModelType)
      : "";
    const safePlatforms = parseListParam(nextPlatformRaw);
    const safeCap = Number.isFinite(nextCap) ? clamp(nextCap, 0, 1_000_000) : 0;
    const safePayout = Number.isFinite(nextPayout) ? clamp(nextPayout, 0, 100) : DEFAULT_MIN_PAYOUT;
const allowedSorts = ["score", "payout", "cap", "name", "truecost"] as const;
const safeSort: SortKey = (allowedSorts as readonly string[]).includes(nextSort)
  ? (nextSort as SortKey)
  : "score";
    setQ((prev) => (prev === nextQ ? prev : nextQ));
    setModel((prev) => (prev === safeModel ? prev : (safeModel as any)));
    setSelectedPlatforms((prev) =>
      arraysEqual(prev, safePlatforms) ? prev : safePlatforms
    );
    setMaxMinFunding((prev) => (prev === safeCap ? prev : safeCap));
    setMinPayout((prev) => (prev === safePayout ? prev : safePayout));
    setSort((prev) => (prev === safeSort ? prev : safeSort));
    setCompare((prev) =>
      prev.length === nextCompare.length && prev.every((v, i) => v === nextCompare[i])
        ? prev
        : nextCompare
    );
  }, [searchParams, compareKeyWhitelist]);

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
    if (selectedPlatforms.length > 0) sp.set("platforms", selectedPlatforms.join(","));
    else {
      sp.delete("platforms");
      sp.delete("platform");
    }
    setOrDelete("cap", debouncedCap || 0);
    const payoutParam = Number.isFinite(debouncedPayout) ? debouncedPayout : DEFAULT_MIN_PAYOUT;
    if (payoutParam === DEFAULT_MIN_PAYOUT) setOrDelete("payout", "");
    else setOrDelete("payout", payoutParam);
    setOrDelete("sort", sort);

    const validCompare = compare.filter((key) => compareKeyWhitelist.has(key));
    if (validCompare.length > 0) sp.set("compare", validCompare.join(","));
    else sp.delete("compare");

    const next = `${pathname}?${sp.toString()}`;
    const current = `${pathname}?${searchParams.toString()}`;
    if (next !== current) router.replace(next, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, model, selectedPlatforms, debouncedCap, debouncedPayout, sort, compare, pathname, router, compareKeyWhitelist]);

  // ===== filtering & sorting =====
  type ScoredFirm = UIFirm & { score: number };

  const filtered: UIFirm[] = useMemo(() => {
    const ql = q.toLowerCase();
    const payoutPreset = PAYOUT_SPEED_PRESETS.find((preset) => preset.value === payoutSpeedFilter);
    const payoutMax = payoutPreset?.max ?? null;
    const normalizedSelectedPlatforms = selectedPlatforms
      .map((p) => (p || "").trim().toLowerCase())
      .filter(Boolean);
    return (nFirms ?? []).filter((f) => {
      const { trueCost } = getCosts(f as any);
      const nameOk = !q || (f.name || "").toLowerCase().includes(ql);
      const modelOk = !model || (f.model || []).includes(model);
      const platformsOk =
        normalizedSelectedPlatforms.length === 0 ||
        (f.platforms || []).some((p) => normalizedSelectedPlatforms.includes((p || "").trim().toLowerCase()));
      const fundingOk = (f.maxFunding ?? 0) >= (maxMinFunding ?? 0);
      const splitOk = (f.payoutPct ?? 0) >= (minPayout ?? 0);
      const accountOk =
        accountSizeFilter.length === 0 ||
        accountSizeFilter.some((size) => Math.round(f.accountSize ?? 0) === Number(size));
      const drawdownOk =
        !drawdownFilter ||
        (f.drawdownType || "").toLowerCase().includes(drawdownFilter.toLowerCase());
      const minDaysValue = typeof f.minDays === "number" ? f.minDays : null;
      const payoutSpeedOk =
        !payoutSpeedFilter ||
        ((f.payoutDaysValue ?? Number.POSITIVE_INFINITY) <= (payoutMax ?? Number.POSITIVE_INFINITY));
      const evalSpeedOk = !oneDayEvalOnly || minDaysValue === 1;
      const instantFundedOk = !instantFundedOnly || minDaysValue === 0;
    const discountValue =
      f.discount?.percent ?? (f.discount as { amount?: number } | undefined)?.amount ?? f.pricing?.discountPct ?? 0;
      const discountRequired = discountOnly || fireDealsMode;
      const discountOk = !discountRequired || Number(discountValue) > 0;
      const trustRequirement = Math.max(minTrust ?? 0, fireDealsMode ? FIRE_DEAL_TRUST_MIN : 0);
      const trustOk = (f.trustpilot ?? 0) >= trustRequirement;
      const lowCostOk = !fireDealsMode || trueCost <= FIRE_DEAL_TRUECOST_MAX;
      const favoritesOk = !favoritesOnly || isFavorite(f.key);
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
        discountOk &&
        lowCostOk &&
        trustOk &&
        favoritesOk &&
        instantFundedOk
      );
    });
  }, [
    nFirms,
    q,
    model,
    selectedPlatforms,
    maxMinFunding,
    minPayout,
    accountSizeFilter,
    drawdownFilter,
    payoutSpeedFilter,
    oneDayEvalOnly,
    instantFundedOnly,
    discountOnly,
    fireDealsMode,
    minTrust,
    favoritesOnly,
    isFavorite,
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
          // Emphasize higher caps; clamp very large numbers to avoid runaway scores
          return Math.min((f.maxFunding ?? 0) / 50_000, 120);
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
        case "discount": {
          const discountValue =
            f.discount?.percent ??
            ("amount" in (f.discount ?? {}) ? (f.discount as { amount?: number }).amount : undefined) ??
            f.pricing?.discountPct ??
            0;
          return Number(discountValue) > 0 ? 100 : 40;
        }
        case "evalspeed": {
          const min = f.minDays ?? Number.POSITIVE_INFINITY;
          if (!Number.isFinite(min)) return 40;
          // Ignore instant programs (minDays === 0) for quick-eval scoring
          if (min <= 0) return 20;
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

  useEffect(() => {
    setCardsPage((prev) => {
      const maxPage = Math.max(1, Math.ceil(scored.length / CARDS_PER_PAGE));
      return clamp(prev, 1, maxPage);
    });
  }, [scored.length]);

  const cardsPageCount = Math.max(1, Math.ceil(scored.length / CARDS_PER_PAGE));
  const currentCardsPage = clamp(cardsPage, 1, cardsPageCount);
  const paginatedScored = scored.slice(
    (currentCardsPage - 1) * CARDS_PER_PAGE,
    currentCardsPage * CARDS_PER_PAGE
  );
  const showingStart = scored.length === 0 ? 0 : (currentCardsPage - 1) * CARDS_PER_PAGE + 1;
  const showingEnd = Math.min(currentCardsPage * CARDS_PER_PAGE, scored.length);
  const selected = scored.filter((f) => compare.includes(f.key));
  const displayedPlatforms = showAllPlatforms ? platformOptions : platformPreviewList;
  const hiddenPlatformCount = showAllPlatforms
    ? 0
    : Math.max(platformOptions.length - platformPreviewList.length, 0);
  const usingDefaultScoreFocus =
    scoreFocus.length === 0 ||
    (scoreFocus.length === DEFAULT_SCORE_FOCUS.length &&
      DEFAULT_SCORE_FOCUS.every((criterion) => scoreFocus.includes(criterion)));
  const scoreFocusPresets = SCORE_FOCUS_PRESETS;
  const hasActiveFilters =
    Boolean(
      q ||
        model ||
        selectedPlatforms.length > 0 ||
        accountSizeFilter.length > 0 ||
        drawdownFilter ||
        payoutSpeedFilter ||
        maxMinFunding > 0 ||
        minPayout !== DEFAULT_MIN_PAYOUT ||
        oneDayEvalOnly ||
        instantFundedOnly ||
        discountOnly ||
        fireDealsMode ||
        minTrust > 0 ||
        favoritesOnly ||
        !usingDefaultScoreFocus
    ) || compare.length > 0;
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
      <section className="surface golden-filter-panel rounded-2xl border border-[#f6c850]/40 p-4 md:p-6 shadow-[0_0_40px_rgba(246,200,80,0.25)] space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-white/70">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-[#5fffc2]/60 bg-[#050c17] text-[#050c17] focus:ring-0 checked:bg-[#5fffc2] checked:border-[#5fffc2]"
              checked={favoritesOnly}
              onChange={(event) => {
                handleManualFilterChange();
                setFavoritesOnly(event.target.checked);
              }}
            />
            Favorites only ({favorites.length})
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={favoriteFirms.length === 0}
            onClick={handleExportFavorites}
            className="rounded-full border border-[#5fffc2]/50 text-xs font-semibold uppercase tracking-[0.2em] text-[#5fffc2] disabled:opacity-40"
          >
            Export favorites
            {favoriteFirms.length > 0 ? ` (${favoriteFirms.length})` : ""}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={favorites.length === 0}
            onClick={clearFavorites}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 hover:text-white disabled:opacity-30"
          >
            Clear favorites
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Model</p>
              <div className="mt-2">
                <FilterChips
                  options={["", ...MODELS]}
                  value={model}
                  onChange={(v) => {
                    handleManualFilterChange();
                    setModel(v as ModelType | "");
                  }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Account size</p>
              <div className="mt-2">
                <MultiFilterChips
                  options={ACCOUNT_SIZE_OPTIONS}
                  value={accountSizeFilter}
                  onChange={(next) => {
                    handleManualFilterChange();
                    setAccountSizeFilter(next);
                  }}
                  getLabel={(opt) => (!opt ? "All" : `$${Number(opt).toLocaleString()}`)}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
                Minimum max funding
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MAX_FUNDING_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={chipClasses(maxMinFunding === preset)}
                    onClick={() => {
                      handleManualFilterChange();
                      setMaxMinFunding(preset);
                    }}
                  >
                    {preset === 0 ? "All" : `$${preset.toLocaleString()}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Platforms</p>
                {!showAllPlatforms && hiddenPlatformCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-dashed border-amber-200/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-100"
                    onClick={() => setShowAllPlatforms(true)}
                  >
                    More platforms ({hiddenPlatformCount})
                  </Button>
                ) : showAllPlatforms ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-3 py-1 text-[11px] uppercase tracking-wider text-white/60"
                    onClick={() => setShowAllPlatforms(false)}
                  >
                    Show fewer
                  </Button>
                ) : null}
              </div>
              <div className="mt-2">
                <MultiFilterChips
                  options={["", ...displayedPlatforms]}
                  value={selectedPlatforms}
                  onChange={(next) => {
                    handleManualFilterChange();
                    setSelectedPlatforms(next as PlatformType[]);
                  }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Drawdown type</p>
              <div className="mt-2">
                <FilterChips
                  options={["", ...DRAW_DOWN_OPTIONS]}
                  value={drawdownFilter}
                  onChange={(opt) => {
                    handleManualFilterChange();
                    setDrawdownFilter(opt);
                  }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Payout speed</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PAYOUT_SPEED_PRESETS.map((preset) => {
                  const active = payoutSpeedFilter === preset.value;
                  return (
                    <button
                      key={preset.value || "any"}
                      type="button"
                      className={chipClasses(active)}
                      onClick={() => {
                        handleManualFilterChange();
                        setPayoutSpeedFilter((prev) => (prev === preset.value ? "" : preset.value));
                      }}
                      title={preset.max ? `Within ${preset.max} days` : "Any payout timing"}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Minimum payout split</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MIN_PAYOUT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={chipClasses(minPayout === preset)}
                  onClick={() => {
                    handleManualFilterChange();
                    setMinPayout(preset);
                  }}
                >
                  {preset === 0 ? "All" : `${preset}%`}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Score focus</p>
            <span className="text-xs text-white/50">
              Used when sorting by score. "Trusted" treats 3+ Trustpilot ratings as favorable.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={chipClasses(usingDefaultScoreFocus)}
              onClick={() => {
                handleManualFilterChange();
                setScoreFocus([]);
              }}
            >
              All criteria
            </button>
            {scoreFocusPresets.map((preset) => {
              const isDiscount = preset.value === "discount";
              const active = isDiscount ? discountOnly : scoreFocus.includes(preset.value);
              return (
                <button
                  key={preset.value}
                  type="button"
                  className={chipClasses(active)}
                  onClick={() => {
                    handleManualFilterChange();
                    if (preset.value === "funding") {
                      setSort("cap");
                    }
                    if (isDiscount) {
                      setDiscountOnly((prev) => {
                        const next = !prev;
                        setScoreFocus((prevFocus) => {
                          const has = prevFocus.includes("discount");
                          if (next && !has) return [...prevFocus, "discount"];
                          if (!next) return prevFocus.filter((item) => item !== "discount");
                          return prevFocus;
                        });
                        return next;
                      });
                    } else {
                      setScoreFocus((prev) =>
                        prev.includes(preset.value)
                          ? prev.filter((item) => item !== preset.value)
                          : [...prev, preset.value]
                      );
                    }
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sort by</span>
            <FilterChips
              options={["score", "payout", "cap", "name", "truecost"]}
              value={sort}
              onChange={(v) => setSort(v as any)}
            />
          </div>

          <button
            type="button"
            aria-pressed={fireDealsMode}
            title={`Applies discount + low cost (true cost <= $${FIRE_DEAL_TRUECOST_MAX}) + trusted (Trustpilot >= ${FIRE_DEAL_TRUST_MIN}).`}
            onClick={toggleFireDeals}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] shadow transition ${
              fireDealsMode
                ? "bg-gradient-to-r from-orange-500 via-amber-400 to-amber-300 text-black/90 shadow-[0_8px_20px_-10px_rgba(255,140,0,0.6)]"
                : "border border-orange-300/70 bg-transparent text-orange-200 hover:text-orange-100"
            }`}
          >
            Fire deals
          </button>
          {fireDealsMode ? (
            <div className="flex flex-wrap gap-1 text-xs uppercase tracking-wide text-amber-200">
              <span className="rounded-full border border-amber-300/60 px-2 py-0.5">Low cost</span>
              <span className="rounded-full border border-amber-300/60 px-2 py-0.5">Has discount</span>
              <span className="rounded-full border border-amber-300/60 px-2 py-0.5">Trusted 3+</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>Min Trustpilot</span>
            <select
              value={minTrust}
              onChange={(event) => {
                handleManualFilterChange();
                setMinTrust(Number(event.target.value));
              }}
              className="rounded-full border border-[#f6c850]/60 bg-[#040c17] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#f6c850] outline-none focus:border-[#f6c850]"
            >
              {TRUST_OPTIONS.map((option) => (
                <option key={option} value={option} className="text-emerald-950">
                  {option === 0 ? "0+" : `${option}+`}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              onClick={doReset}
              className="ml-auto"
              title="Reset search, filters, sliders, sort, and compare"
            >
              Reset filters
            </Button>
          ) : null}
        </div>
      </section>

      {/* Divider */}
      <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      {/* Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedScored.map((f, idx) => {
          const cost = getCosts(f as any);
          const isFavoriteCard = isFavorite(f.key);
          const fallbackLogo = `/logos/${f.key}.png`;
          const resolvedLogo = f.logo?.trim().length ? f.logo.trim() : fallbackLogo;
          const discountSource =
            (f.pricing as any)?.discount ??
            f.discount ??
            (f.pricing?.discountPct
              ? { percent: f.pricing.discountPct, label: f.pricing.discountLabel ?? null }
              : null);
          const rawPercent =
            typeof (discountSource as { percent?: number })?.percent === "number"
              ? (discountSource as { percent?: number }).percent
              : typeof f.pricing?.discountPct === "number"
              ? f.pricing.discountPct
              : null;
          const rawAmount =
            typeof (discountSource as { amount?: number })?.amount === "number"
              ? (discountSource as { amount?: number }).amount
              : null;
          const discountLabel =
            (discountSource as { label?: string })?.label ??
            (rawAmount && rawAmount > 0
              ? `$${rawAmount.toLocaleString()} off`
              : rawPercent && rawPercent > 0
              ? `${rawPercent}% off`
              : null);
          const fundingDisplay = formatFundingOrAccounts(f.maxFunding, f.maxAccounts);
          return (
            <Card
              key={`${f.key}-${idx}`}
              className={`flex h-full rounded-2xl surface elevated border shadow-sm transition-all ${
                isFavoriteCard
                  ? "border-[#5fffc2]/70 shadow-[0_0_25px_rgba(95,255,194,0.35)] hover:border-[#5fffc2]"
                  : "border-amber-300/15 hover:border-amber-300/35"
              }`}
            >
              <CardContent className="flex h-full flex-col space-y-3 p-4">
                {/* header row: logo + discount badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ScoreCardLogo name={f.name} src={resolvedLogo} />
                  </div>

                  <div className="flex items-center gap-2">
                    {Boolean(discountLabel) ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-300 border border-amber-300/30">
                        {discountLabel}
                        {f.discount?.code ? ` – ${f.discount.code}` : ""}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-white/5 text-white/60 border border-white/10">
                        No promo
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(f.key)}
                      aria-pressed={isFavoriteCard}
                      aria-label={isFavoriteCard ? "Remove favorite" : "Save to favorites"}
                      className={`rounded-full border px-2 py-1 transition ${
                        isFavoriteCard
                          ? "border-[#5fffc2]/80 text-[#5fffc2]"
                          : "border-white/15 text-white/60 hover:text-white"
                      }`}
                    >
                      <Heart
                        size={16}
                        className="transition"
                        fill={isFavoriteCard ? "#5fffc2" : "transparent"}
                        color={isFavoriteCard ? "#04111c" : "currentColor"}
                      />
                    </button>
                  </div>
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
                {f.accountLabel ? (
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">{f.accountLabel}</p>
                ) : null}

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

                <div className="flex flex-1 flex-col gap-3">
                  <ul className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <li className="text-[#5fffc2] font-semibold">
                      <span className="text-[#5fffc2]/90">True cost:</span> ${cost.trueCost.toLocaleString()}
                    </li>
                    <li className="text-[#5fffc2] font-semibold">
                      <span className="text-[#5fffc2]/90">Account size:</span> $
                      {f.accountSize?.toLocaleString() ?? "-"}
                    </li>
                    <li>
                      <strong>Up-front:</strong> ${cost.evalAfterDiscount.toLocaleString()}
                    </li>
                    <li>
                      <strong>Activation:</strong> ${Number(f.pricing?.activationFee ?? 0).toLocaleString()}
                    </li>
                    {f.discount && Boolean(discountLabel) && (
                      <li className="col-span-2 text-xs font-medium text-amber-300">
                        {f.discount.label || "Promo"} ({cost.discountPct}% off)
                        {f.discount?.code && (
                          <span className="text-muted-foreground"> -- code: {f.discount.code}</span>
                        )}
                      </li>
                    )}
                    <li>
                      <strong>Payout:</strong> {f.payoutPct ?? 0}%
                    </li>
                    <li>
                      {fundingDisplay ? (
                        <>
                          <strong>{fundingDisplay.label}:</strong> {fundingDisplay.value}
                        </>
                      ) : null}
                    </li>
                    <li>
                      <strong>Min days (Eval):</strong> {formatMinDaysDisplay(f.minDays)}
                    </li>
                    <li className="col-span-2">
                      <strong>Platforms:</strong> {(f.platforms ?? []).join(" / ")}
                    </li>
                    <li>
                      <strong>Refund:</strong> {f.feeRefund ? "Yes" : "No"}
                    </li>
                    <li>
                      <strong>News trading:</strong> {formatNewsTrading(f)}
                    </li>
                    <li>
                      <strong>Weekend hold:</strong> {f.weekendHolding ? "Yes" : "No"}
                    </li>
                    <li className="col-span-2 flex items-center gap-2 text-amber-300">
                      <span className="text-base leading-none">{formatStarIcons(f.trustpilot)}</span>
                      <span className="text-xs text-white/80">{(f.trustpilot ?? 0).toFixed(1)}</span>
                    </li>
                  </ul>

                  <div className="mt-auto space-y-3">
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

                      <Link href={`/firm/${f.key}`} className="w-full">
                        <Button
                          variant="outline"
                          className="w-full border-white/20 bg-white/5 text-white hover:border-[#5fffc2] hover:text-[#5fffc2]"
                        >
                          More details
                        </Button>
                      </Link>
                    </div>

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
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {scored.length > CARDS_PER_PAGE && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Showing {showingStart}-{showingEnd} of {scored.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentCardsPage === 1}
              onClick={() => setCardsPage((prev) => Math.max(1, prev - 1))}
              className="rounded-full border-[#f6c850]/50 text-xs font-semibold uppercase tracking-[0.2em] text-[#f6c850] disabled:opacity-40"
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-white/70">
              Page {currentCardsPage} / {cardsPageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentCardsPage === cardsPageCount}
              onClick={() => setCardsPage((prev) => Math.min(cardsPageCount, prev + 1))}
              className="rounded-full border-[#f6c850]/50 text-xs font-semibold uppercase tracking-[0.2em] text-[#f6c850] disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
                  <th className="p-2 text-left">Max funding / accounts</th>
                  <th className="p-2 text-left">Min Days (Eval)</th>
                  <th className="p-2 text-left">Rules</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((f, idx) => {
                  const fundingDisplay = formatFundingOrAccounts(f.maxFunding, f.maxAccounts);
                  return (
                    <tr key={`cmp-${f.key}-${idx}`} className="border-t">
                      <td className="p-2 font-medium">{f.name}</td>
                      <td className="p-2">{f.model.join(", ")}</td>
                      <td className="p-2">{f.platforms.join(", ")}</td>
                      <td className="p-2">{Math.round((f.payout ?? 0) * 100)}%</td>
                      <td className="p-2">{fundingDisplay?.value ?? ""}</td>
                      <td className="p-2">{formatMinDaysDisplay(f.minDays)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          {typeof f.newsTradingEval === "boolean" || typeof f.newsTradingFunded === "boolean" ? (
                            <>
                              {typeof f.newsTradingEval === "boolean" ? (
                                <Badge variant="outline">News Eval: {f.newsTradingEval ? "OK" : "No"}</Badge>
                              ) : null}
                              {typeof f.newsTradingFunded === "boolean" ? (
                                <Badge variant="outline">News Funded: {f.newsTradingFunded ? "OK" : "No"}</Badge>
                              ) : null}
                            </>
                          ) : (
                            <Badge variant="outline">News: {f.newsTrading ? "OK" : "No"}</Badge>
                          )}
                          <Badge variant="outline">Weekend: {f.weekendHolding ? "OK" : "No"}</Badge>
                          <Badge variant="outline">Refund: {f.feeRefund ? "Yes" : "No"}</Badge>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 space-y-6">
        <Script id="ld-json" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        {/* Tip for full filtering */}
        <div className="flex items-center gap-2 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
          <Info size={12} className="text-white/50" />
          <span>
            Want more filters? Switch to{" "}
            <Link
              href={{ pathname: "/", query: { view: "cards" } }}
              className="text-[#f6c850] underline-offset-4 hover:underline"
            >
              Score Cards
            </Link>{" "}
            for the full filter set.
          </span>
        </div>

        {/* Top disclosure */}
        <AffiliateNotice />

        {/* Toggle: default view = Table; switch to Cards with ?view=cards */}
        <HomeViewToggle
          cards={HomeCards}
          firms={firms}
          fireDealsMode={fireDealsMode}
          tableFireDealsMode={tableFireDealsMode}
          onToggleTableFireDeals={toggleTableFireDeals}
          onToggleFireDeals={toggleFireDeals}
          fastPassActive={oneDayEvalOnly}
          instantFundedActive={instantFundedOnly}
          onToggleFastPass={toggleFastPass}
          onToggleInstantFunded={toggleInstantFunded}
          searchQuery={q}
          tableAccountSize={tableAccountSize}
          tableAccountSizeOptions={ACCOUNT_SIZE_OPTIONS}
          tableFirmName={tableFirmName}
          tableFirmOptions={firmNameOptions}
          onTableAccountSizeChange={(value) => {
            setTableAccountSize(value || "");
          }}
          onTableFirmChange={(value) => {
            setTableFirmName(value || "");
          }}
        />

        {!isCardsView && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              <Search size={16} /> Search firms
            </p>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleManualFilterChange();
                setQ(searchDraft);
              }}
            >
              <Input
                placeholder="Search by name"
                list="home-firm-search-options"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                className="flex-1 min-w-0 border border-white/15 bg-[#050b15] text-white placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-[#f6c850] focus-visible:ring-offset-0"
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
              <Button
                type="submit"
                size="sm"
                className="rounded-full bg-gradient-to-r from-[#f7d778] via-[#f6c850] to-[#f0b429] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-950 shadow-[0_8px_20px_-10px_rgba(246,200,80,0.8)] transition hover:brightness-110"
              >
                Search
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white"
                onClick={() => {
                  handleManualFilterChange();
                  setSearchDraft("");
                  setQ("");
                }}
              >
                Clear
              </Button>
            </form>
          </section>
        )}

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

const chipClasses = (active: boolean) =>
  `rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
    active
      ? "border-[#f6c850] bg-gradient-to-r from-[#f7d778] via-[#f6c850] to-[#f0b429] text-emerald-950 shadow-[0_8px_20px_-10px_rgba(246,200,80,0.8)]"
      : "border-[#f6c850]/50 text-[#f6c850]/80 hover:text-[#f6c850] hover:border-[#f6c850]"
  }`;

function FilterChips({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  getLabel?: (v: string) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt, idx) => {
        const label = getLabel ? getLabel(opt) : opt === "" ? "All" : opt;
        const active = value === opt;
        return (
          <button
            key={opt || `option-${idx}`}
            type="button"
            onClick={() => onChange(opt)}
            className={chipClasses(active)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function MultiFilterChips({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  getLabel?: (v: string) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt, idx) => {
        const label = getLabel ? getLabel(opt) : opt === "" ? "All" : opt;
        const active = opt === "" ? value.length === 0 : value.includes(opt);
        return (
          <button
            key={opt || `multi-${idx}`}
            type="button"
            onClick={() => {
              if (opt === "") {
                onChange([]);
                return;
              }
              const withoutEmpty = value.filter((item) => item !== "");
              onChange(
                active
                  ? withoutEmpty.filter((item) => item !== opt)
                  : [...withoutEmpty, opt]
              );
            }}
            className={chipClasses(active)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ScoreCardLogo({ name, src }: { name?: string | null; src: string }) {
  const [errored, setErrored] = useState(false);
  const initials =
    name
      ?.split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const showImage = Boolean(src) && !errored;

  return (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#ffe5a3]/85 via-[#ffcb70]/75 to-[#ff9f48]/70 p-[2px] shadow-[0_10px_18px_-12px_rgba(255,198,88,0.75)]">
      <div className="flex h-full w-full items-center justify-center rounded-[16px] bg-slate-950/90">
        {showImage ? (
          <Image
            src={src}
            alt={`${name ?? "Firm"} logo`}
            width={64}
            height={64}
            className="h-full w-full object-contain p-1.5"
            unoptimized
            onError={() => setErrored(true)}
          />
        ) : (
          <span className="text-xs font-semibold tracking-[0.2em] text-white/80">{initials}</span>
        )}
      </div>
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
        Contact: <a className="underline" href="mailto:hello@madprops.com">hello@madprops.com</a>
      </p>
    </footer>
  );
}

