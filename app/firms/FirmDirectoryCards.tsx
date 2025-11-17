"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Firm } from "@/lib/types";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { Button } from "@/components/ui/button";
import { useFirms, type FirmRow } from "@/lib/useFirms";

type Props = {
  firms: Firm[];
  initialExpandedKey?: string | null;
};

type GroupedFirm = Firm & { accounts: AccountRow[]; slugKey: string };
type AccountRow = {
  name: string;
  label?: string | null;
  accountSize?: number | null;
  maxFunding?: number | null;
  payoutPct?: number | null;
  minDays?: number | null;
  daysToPayout?: number | string | null;
  drawdownType?: string | null;
  spreads?: string | null;
  feeRefund?: boolean | null;
  newsTrading?: boolean | null;
  weekendHolding?: boolean | null;
  pricing?: any;
};

const slugify = (value?: string | null) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

function groupFirmRows(rows: (FirmRow | Firm)[], directoryMap?: Map<string, string>): GroupedFirm[] {
  const map = new Map<string, GroupedFirm>();
  rows.forEach((row) => {
    const baseName = row.name || "";
    const baseNameKey = baseName.toLowerCase().trim();
    const directoryKey = directoryMap?.get(baseNameKey) ?? null;
    const rawKey = (row as FirmRow).key ?? (row as Firm).key ?? "";
    const normalizedKey = slugify(rawKey);
    const nameSlug = slugify(baseName);
    const canonicalKey = directoryKey || normalizedKey || nameSlug || baseName || "";
    if (!canonicalKey) return;

    const mapKey = directoryKey || nameSlug || canonicalKey;
    const slugKey = canonicalKey;
    const base: GroupedFirm = map.get(mapKey) || {
      slugKey,
      key: canonicalKey,
      name: baseName || canonicalKey,
      homepage: (row as any).homepage ?? null,
      signup: (row as any).signup ?? null,
      logo: (row as any).logo ?? (canonicalKey ? `/logos/${canonicalKey}.png` : null),
      model: Array.isArray((row as any).model) ? (row as any).model : [],
      platforms: Array.isArray((row as any).platforms) ? (row as any).platforms : [],
      maxFunding: typeof (row as any).maxFunding === "number" ? (row as any).maxFunding : null,
      payout: typeof (row as any).payoutSplit === "number" ? (row as any).payoutSplit / 100 : null,
      payoutSplit: typeof (row as any).payoutSplit === "number" ? (row as any).payoutSplit : null,
      payoutDisplay: (row as any).payoutDisplay ?? null,
      accountSize: typeof (row as any).accountSize === "number" ? (row as any).accountSize : null,
      minDays: typeof (row as any).minDays === "number" ? (row as any).minDays : null,
      daysToPayout: (row as any).daysToPayout ?? null,
      drawdownType: (row as any).drawdownType ?? null,
      spreads: (row as any).spreads ?? null,
      feeRefund: (row as any).feeRefund ?? null,
      newsTrading: (row as any).newsTrading ?? null,
      weekendHolding: (row as any).weekendHolding ?? null,
      trustpilot: typeof (row as any).trustpilot === "number" ? (row as any).trustpilot : null,
      pricing: (row as any).pricing ?? null,
      discount: (row as any).pricing?.discount ?? (row as any).discount ?? null,
      notes: (row as any).notes ?? null,
      accounts: [],
    };

    base.accounts.push({
      name:
        (row as any).accountLabel ||
        (row as any).notes ||
        `${(row as any).accountSize ? `$${(row as any).accountSize.toLocaleString()}` : "Account"}`,
      label: (row as any).accountLabel ?? null,
      accountSize: typeof (row as any).accountSize === "number" ? (row as any).accountSize : null,
      maxFunding: typeof (row as any).maxFunding === "number" ? (row as any).maxFunding : null,
      payoutPct: typeof (row as any).payoutSplit === "number" ? (row as any).payoutSplit : null,
      minDays: typeof (row as any).minDays === "number" ? (row as any).minDays : null,
      daysToPayout: (row as any).daysToPayout ?? null,
      drawdownType: (row as any).drawdownType ?? null,
      spreads: (row as any).spreads ?? null,
      feeRefund: (row as any).feeRefund ?? null,
      newsTrading: (row as any).newsTrading ?? null,
      weekendHolding: (row as any).weekendHolding ?? null,
      pricing: (row as any).pricing ?? null,
    });

    map.set(mapKey, base);
  });

  return Array.from(map.values());
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `$${value.toLocaleString()}`;
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

export function FirmDirectoryCards({ firms, initialExpandedKey }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(initialExpandedKey ?? null);
  const [pendingScrollKey, setPendingScrollKey] = useState<string | null>(initialExpandedKey ?? null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { firms: liveFirms } = useFirms();
  const directoryKeyMap = useMemo(() => {
    const map = new Map<string, string>();
    firms.forEach((firm) => {
      const nameKey = (firm.name || "").toLowerCase().trim();
      const slug = slugify(firm.key ?? firm.name);
      if (!nameKey || !slug) return;
      map.set(nameKey, slug);
    });
    return map;
  }, [firms]);

  const dataFirms = useMemo(() => {
    if (liveFirms.length > 0) {
      return groupFirmRows(liveFirms, directoryKeyMap);
    }
    return firms.map((firm) => ({
      ...firm,
      slugKey: slugify(firm.key ?? firm.name),
      accounts: [],
    })) as GroupedFirm[];
  }, [liveFirms, firms, directoryKeyMap]);

  const scrollFirmIntoView = useCallback((el: HTMLElement) => {
    if (typeof window === "undefined") return;
    const extraOffset = -200; // pull the card further down (positive moves lower, negative moves higher)
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const target = absoluteTop - window.innerHeight / 2 + rect.height / 2 + extraOffset;
      window.scrollTo({
        top: Math.max(target, 0),
        behavior: "smooth",
      });
    });
  }, []);
  useEffect(() => {
    if (!initialExpandedKey) return;
    setExpandedKey(initialExpandedKey);
    setPendingScrollKey(initialExpandedKey);
  }, [initialExpandedKey]);
  useEffect(() => {
    if (initialExpandedKey) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const firmParam = (params.get("firm") ?? "").trim();
    let targetKey = firmParam;
    const hash = window.location.hash.replace(/^#/, "");
    if (!targetKey && hash.startsWith("firm-")) targetKey = hash.replace("firm-", "");
    if (targetKey) {
      setExpandedKey(targetKey);
      setPendingScrollKey(targetKey);
    }
  }, [initialExpandedKey]);

  useEffect(() => {
    if (!pendingScrollKey) return;
    if (expandedKey !== pendingScrollKey) return;
    if (typeof window === "undefined") return;
    const hash = `firm-${pendingScrollKey}`;
    const el = document.getElementById(hash);
    if (!el) return;
    const delays = [100, 350, 650];
    const timeouts = delays.map((delay) =>
      window.setTimeout(() => scrollFirmIntoView(el), delay)
    );
    const finalTimeout = window.setTimeout(() => {
      scrollFirmIntoView(el);
      setPendingScrollKey(null);
    }, delays[delays.length - 1] + 300);
    timeouts.push(finalTimeout);
    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, [expandedKey, pendingScrollKey, scrollFirmIntoView]);

  const filteredFirms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return dataFirms;
    const matchesBase = dataFirms.filter((firm) =>
      firm.name.toLowerCase().includes(query)
    );
    if (matchesBase.length > 0) return matchesBase;
    // fallback: check account descriptions
    return dataFirms.filter((firm) =>
      (firm.accounts ?? []).some((account) =>
        account.name.toLowerCase().includes(query)
      )
    );
  }, [dataFirms, searchTerm]);

  useEffect(() => {
    if (!searchTerm.trim()) return;
    if (filteredFirms.some((firm) => firm.key === expandedKey)) return;
    setExpandedKey(filteredFirms[0]?.key ?? null);
  }, [searchTerm, filteredFirms, expandedKey]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
      >
        <label className="sr-only" htmlFor="firm-search">
          Search firms
        </label>
        <input
          id="firm-search"
          type="search"
          list="firm-search-options"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search firms..."
          className="flex-1 rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-300/60 focus:outline-none"
        />
        <datalist id="firm-search-options">
          {dataFirms
            .filter((firm) =>
              searchInput.trim() ? firm.name.toLowerCase().startsWith(searchInput.trim().toLowerCase()) : false
            )
            .map((firm) => (
              <option key={firm.key} value={firm.name} />
            ))}
        </datalist>
        <Button
          type="submit"
          className="rounded-xl bg-emerald-300/90 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:bg-emerald-200"
        >
          Search
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-white/70 hover:text-white"
          onClick={() => {
            setSearchInput("");
            setSearchTerm("");
          }}
        >
          Clear
        </Button>
      </form>

      <div className="grid gap-5">
        {filteredFirms.map((firm) => {
        const accounts = (firm as GroupedFirm).accounts ?? [];
        const isOpen = expandedKey === firm.key;
        const toggle = () => setExpandedKey(isOpen ? null : firm.key);
        const signupUrl = buildAffiliateUrl(firm.signup, firm.key);
        const homepage = firm.homepage || `/firm/${firm.key}`;
        const programBlurb = firm.notes ?? `Models: ${(firm.model ?? []).join(", ") || "N/A"}`;
        const payoutPct = typeof firm.payout === "number" ? firm.payout : undefined;
        const logoSrc = firm.logo?.trim() ? firm.logo.trim() : `/logos/${firm.key}.png`;

        return (
          <article
            id={`firm-${firm.key}`}
            key={firm.key}
            style={{ scrollMarginTop: "45vh" }}
            className="rounded-3xl border border-white/10 bg-white/5/30 p-5 shadow-[0_40px_60px_-50px_black] transition hover:border-emerald-400/40 hover:bg-white/10"
          >
            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-center justify-between gap-4 text-left"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-4">
                <FirmLogo name={firm.name} src={logoSrc} />
                <div>
                  <p className="text-lg font-semibold text-white">{firm.name}</p>
                  <p className="text-sm text-white/60">{programBlurb}</p>
                </div>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                {isOpen ? "Hide" : "Details"}
              </span>
            </button>

            {isOpen ? (
              <div className="mt-4 space-y-4 border-t border-white/10 pt-4 text-sm text-white/80">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Models" value={(firm.model ?? []).join(", ") || "N/A"} />
                  <Detail label="Platforms" value={(firm.platforms ?? []).join(", ") || "N/A"} />
                  <Detail label="Min days" value={firm.minDays ? `${firm.minDays}` : "-"} />
                  <Detail label="Days to payout" value={firm.daysToPayout ? `${firm.daysToPayout}` : "-"} />
                  <Detail label="Payout" value={formatPercent(payoutPct)} />
                  <Detail label="Max funding" value={formatMoney(firm.maxFunding)} />
                  <Detail label="Drawdown" value={firm.drawdownType ?? "-"} />
                  <Detail label="Spread type" value={firm.spreads ?? "-"} />
                  <Detail label="Trustpilot" value={typeof firm.trustpilot === "number" ? firm.trustpilot.toFixed(1) : "-"} />
                </div>

                <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em]">
                  <Pill label="Fee refund" active={Boolean(firm.feeRefund)} />
                  <Pill label="News OK" active={Boolean(firm.newsTrading)} />
                  <Pill label="Weekend OK" active={Boolean(firm.weekendHolding)} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/firm/${firm.key}`}
                    className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 hover:text-white"
                  >
                    Firm breakdown
                  </Link>
                  <a
                    href={signupUrl || homepage}
                    target="_blank"
                    rel="nofollow noopener"
                    className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-300/90 to-emerald-200/80 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:from-emerald-300 hover:to-emerald-200"
                  >
                    Visit / Sign up
                  </a>
                </div>

                {accounts.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">Account options</p>
                    <div className="mt-3 space-y-3">
                      {accounts.map((account, idx) => {
                        const label = account.label || account.name || "";
                        const size = account.accountSize
                          ? `$${account.accountSize.toLocaleString()}`
                          : "";
                        return (
                          <div
                            key={`${firm.key}-acct-${idx}`}
                            className="grid gap-3 sm:grid-cols-3 text-sm text-white/80 border border-white/5 rounded-xl px-3 py-2"
                          >
                            <span className="font-semibold">
                              {size ? `${size}${label ? ` · ${label}` : ""}` : label || "Account"}
                            </span>
                            <span>
                              Payout:{" "}
                              {typeof account.payoutPct === "number" ? `${Math.round(account.payoutPct)}%` : "-"}
                            </span>
                            <span>
                              Days to payout: {account.daysToPayout ? String(account.daysToPayout) : "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
      </div>
      {filteredFirms.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-black/40 px-4 py-6 text-center text-sm text-white/60">
          No firms match that search yet.
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.35em] text-white/40">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function Pill({ label, active }: { label: string; active: boolean }) {
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

function FirmLogo({ name, src }: { name: string; src: string }) {
  const [errored, setErrored] = useState(false);
  const initials =
    name
      ?.split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const LogoPanel = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#ffe5a3]/85 via-[#ffcb70]/75 to-[#ff9f48]/70 p-[2px] shadow-[0_18px_32px_-18px_rgba(255,198,88,0.8)]">
      <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-slate-950/90">
        {children}
      </div>
    </div>
  );

  if (errored) {
    return (
      <LogoPanel>
        <span className="text-base font-semibold tracking-[0.2em] text-white/80">{initials}</span>
      </LogoPanel>
    );
  }
  return (
    <LogoPanel>
      <Image
        src={src}
        alt={`${name} logo`}
        width={72}
        height={72}
        className="h-full w-full object-contain p-2.5"
        unoptimized
        onError={() => setErrored(true)}
      />
    </LogoPanel>
  );
}
