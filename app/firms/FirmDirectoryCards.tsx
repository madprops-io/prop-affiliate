"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Firm } from "@/lib/types";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { Button } from "@/components/ui/button";

type Props = {
  firms: Firm[];
  initialExpandedKey?: string | null;
};

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
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    if (!initialExpandedKey) return;
    setExpandedKey(initialExpandedKey);
    if (typeof window !== "undefined") {
      const hash = `firm-${initialExpandedKey}`;
      const el = document.getElementById(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
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
      const hashId = hash.startsWith("firm-") ? hash : `firm-${targetKey}`;
      const el = document.getElementById(hashId);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }, [initialExpandedKey]);

  const filteredFirms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return firms;
    return firms.filter((firm) => firm.name.toLowerCase().includes(query));
  }, [firms, searchTerm]);

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
          {firms
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
            className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/5/30 p-5 shadow-[0_40px_60px_-50px_black] transition hover:border-emerald-400/40 hover:bg-white/10"
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
  if (errored) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-xs font-semibold text-white/60">
        {name
          ?.split(/\s+/)
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() ?? "?"}
      </div>
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-2">
      <Image
        src={src}
        alt={`${name} logo`}
        width={56}
        height={56}
        className="h-full w-full object-contain"
        unoptimized
        onError={() => setErrored(true)}
      />
    </div>
  );
}
