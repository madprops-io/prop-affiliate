"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import FirmsTable from "@/components/FirmTable";
import type { FirmRow } from "@/lib/useFirms";
import { useRef, useState } from "react";

type ToggleView = "table" | "cards";

type Props = {
  cards: React.ReactNode;
  firms: FirmRow[];
  fireDealsMode: boolean;
  tableFireDealsMode: boolean;
  onToggleTableFireDeals: () => void;
  onToggleFireDeals: () => void;
  fastPassActive: boolean;
  instantFundedActive: boolean;
  onToggleFastPass: () => void;
  onToggleInstantFunded: () => void;
  searchQuery: string;
  tableAccountSize: string;
  tableAccountSizeOptions: readonly string[];
  onTableAccountSizeChange: (value: string) => void;
  tableFirmName: string;
  tableFirmOptions: readonly string[];
  onTableFirmChange: (value: string) => void;
  leadText?: string;
  disclosureText?: string;
  containerClassName?: string;
};

export default function HomeViewToggle(props: Props) {
  const {
    cards,
    firms,
    tableFireDealsMode,
    fastPassActive,
    instantFundedActive,
    onToggleFastPass,
    onToggleInstantFunded,
    searchQuery,
    tableAccountSize,
    tableAccountSizeOptions,
    onTableAccountSizeChange,
    tableFirmName,
    tableFirmOptions,
    onTableFirmChange,
    leadText,
    disclosureText,
    containerClassName,
  } = props;
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const columnsPortalRef = useRef<HTMLDivElement | null>(null);
  const [showAccountSizePicker, setShowAccountSizePicker] = useState(false);
  const [showFirmPicker, setShowFirmPicker] = useState(false);

  // derive the view from the URL, default to "table"
  const viewParam = sp.get("view");
  const isScoreCardsRoute = pathname === "/score-cards";
  const view: ToggleView = isScoreCardsRoute || viewParam === "cards" ? "cards" : "table";

  const setView = (v: ToggleView) => {
    const url = new URL(window.location.href);
    if (v === "table") {
      if (isScoreCardsRoute) {
        router.replace("/", { scroll: false });
        return;
      }
      url.searchParams.delete("view");
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
      return;
    }
    if (isScoreCardsRoute) {
      router.replace("/score-cards", { scroll: false });
      return;
    }
    url.searchParams.set("view", "cards");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };

  const formatAccountSizeLabel = (value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "All";
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 }).format(n);
  };

  const accountSizeLabel = tableAccountSize ? `$${formatAccountSizeLabel(tableAccountSize)}` : "All sizes";
  const firmLabel = tableFirmName ? tableFirmName : "All firms";

  const controls = (
    <div className="flex flex-wrap items-center gap-3">
      {view === "table" ? (
        <>
          <button
            onClick={onToggleFastPass}
            aria-pressed={fastPassActive}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition ${
              fastPassActive
                ? "border-white/40 bg-white text-black"
                : "border-white/20 bg-transparent text-white/70 hover:text-white"
            }`}
          >
            Fast Pass
          </button>
          <button
            onClick={onToggleInstantFunded}
            aria-pressed={instantFundedActive}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition ${
              instantFundedActive
                ? "border-emerald-200/60 bg-emerald-300 text-black"
                : "border-white/20 bg-transparent text-white/70 hover:text-white"
            }`}
          >
            Instant Funded
          </button>
          <div className="relative">
            <button
              onClick={() => setShowAccountSizePicker((prev) => !prev)}
              aria-expanded={showAccountSizePicker}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                showAccountSizePicker
                  ? "bg-white text-black shadow-[0_10px_30px_-15px_rgba(255,255,255,0.8)]"
                  : "border border-white/20 bg-transparent text-white/80 hover:text-white"
              }`}
            >
              <span>Acct size: {accountSizeLabel}</span>
              <span className="text-[10px] leading-none">{showAccountSizePicker ? "▲" : "▼"}</span>
            </button>
            {showAccountSizePicker && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/15 bg-[#040d19]/95 p-3 text-xs text-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl z-30">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/60">Choose size</p>
                <div className="grid gap-1.5">
                  {tableAccountSizeOptions.map((opt, idx) => {
                    const label = opt ? `$${Number(opt).toLocaleString()}` : "All sizes";
                    const active = opt === tableAccountSize;
                    return (
                      <button
                        key={opt || `size-${idx}`}
                        className={`flex w-full items-center justify-between rounded-full px-3 py-1.5 text-left text-[12px] transition ${
                          active
                            ? "bg-[#26ffd4]/20 text-[#26ffd4] ring-1 ring-[#26ffd4]/70"
                            : "bg-white/5 text-white/80 hover:bg-white/10"
                        }`}
                        onClick={() => {
                          onTableAccountSizeChange(opt);
                          setShowAccountSizePicker(false);
                        }}
                        type="button"
                      >
                        <span>{label}</span>
                        {active ? <span className="text-[10px] uppercase tracking-[0.15em]">Active</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFirmPicker((prev) => !prev)}
              aria-expanded={showFirmPicker}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                showFirmPicker
                  ? "bg-white text-black shadow-[0_10px_30px_-15px_rgba(255,255,255,0.8)]"
                  : "border border-white/20 bg-transparent text-white/80 hover:text-white"
              }`}
            >
              <span>Firm: {firmLabel}</span>
              <span className="text-[10px] leading-none">{showFirmPicker ? "▲" : "▼"}</span>
            </button>
            {showFirmPicker && (
              <div className="absolute right-0 mt-2 w-56 max-h-[320px] overflow-auto rounded-2xl border border-white/15 bg-[#040d19]/95 p-3 text-xs text-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl z-30">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/60">Choose firm</p>
                <div className="grid gap-1.5">
                  {[{ label: "All firms", value: "" }, ...tableFirmOptions.map((name) => ({ label: name, value: name }))].map(
                    (opt, idx) => {
                      const active = opt.value === tableFirmName;
                      return (
                        <button
                          key={opt.value || `firm-${idx}`}
                          className={`flex w-full items-center justify-between rounded-full px-3 py-1.5 text-left text-[12px] transition ${
                            active
                              ? "bg-[#26ffd4]/20 text-[#26ffd4] ring-1 ring-[#26ffd4]/70"
                              : "bg-white/5 text-white/80 hover:bg-white/10"
                          }`}
                          onClick={() => {
                            onTableFirmChange(opt.value);
                            setShowFirmPicker(false);
                          }}
                          type="button"
                        >
                          <span className="truncate">{opt.label}</span>
                          {active ? <span className="text-[10px] uppercase tracking-[0.15em]">Active</span> : null}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={() => setView("table")}
          className="rounded-full border border-emerald-400/50 bg-transparent px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300 hover:text-white"
        >
          Table view
        </button>
      )}
      <button
        onClick={() => setView("cards")}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition ${
          view === "cards"
            ? "bg-gradient-to-r from-[#f7d778] via-[#f6c850] to-[#f0b429] text-black"
            : "border border-[#f6c850]/40 bg-transparent text-[#f6c850]/80 hover:text-[#f6c850]"
        }`}
      >
        Score cards
      </button>
    </div>
  );

  const containerClasses = containerClassName ?? "mx-auto max-w-7xl px-4 sm:px-6";
  const hasToolbarText = Boolean(leadText || disclosureText);

  return (
    <>
      <div className={containerClasses}>
        {hasToolbarText ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{controls}</div>
              {view === "table" ? (
                <div ref={columnsPortalRef} className="relative z-20 flex-shrink-0" />
              ) : null}
            </div>
            <div className="space-y-1 sm:text-right">
              {leadText ? <p className="text-sm text-white/70">{leadText}</p> : null}
              {disclosureText ? <p className="text-[10px] text-white/50">{disclosureText}</p> : null}
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{controls}</div>
            {view === "table" ? (
              <div ref={columnsPortalRef} className="relative z-20 flex-shrink-0" />
            ) : null}
          </div>
        )}
        {view === "table" && (
          <div id="compare-table" className={hasToolbarText ? "mt-2" : "mt-1"}>
            <FirmsTable
              firms={firms}
              fireDealsMode={tableFireDealsMode}
              columnsPortalRef={columnsPortalRef}
              fastPassOnly={fastPassActive}
              instantFundedOnly={instantFundedActive}
              searchTerm={searchQuery}
              accountSizeFilter={tableAccountSize ? Number(tableAccountSize) : null}
              firmNameFilter={tableFirmName}
            />
          </div>
        )}
      </div>
      {view === "cards" ? cards : null}
    </>
  );
}
