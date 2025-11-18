"use client";

import { useSearchParams, useRouter } from "next/navigation";
import FirmsTable from "@/components/FirmTable";
import type { FirmRow } from "@/lib/useFirms";
import { useRef } from "react";

type ToggleView = "table" | "cards";

type Props = {
  cards: React.ReactNode;
  firms: FirmRow[];
  fireDealsMode: boolean;
  onToggleFireDeals: () => void;
};

export default function HomeViewToggle({ cards, firms, fireDealsMode, onToggleFireDeals }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const columnsPortalRef = useRef<HTMLDivElement | null>(null);

  // derive the view from the URL, default to "table"
  const viewParam = sp.get("view");
  const view: ToggleView = viewParam === "cards" ? "cards" : "table";

  const setView = (v: ToggleView) => {
    const url = new URL(window.location.href);
    if (v === "table") url.searchParams.delete("view");
    else url.searchParams.set("view", "cards");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };

  const controls = (
    <div className="mb-1 flex flex-wrap items-center gap-3">
      <button
        onClick={() => setView("table")}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition ${
          view === "table"
            ? "bg-emerald-400 text-black"
            : "border border-white/20 bg-transparent text-white/70 hover:text-white"
        }`}
      >
        Table
      </button>
      {view === "table" ? (
        <button
          onClick={onToggleFireDeals}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] shadow transition ${
            fireDealsMode
              ? "bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 text-black shadow-[0_8px_20px_-10px_rgba(255,140,0,0.6)]"
              : "bg-gradient-to-r from-orange-500 via-amber-400 to-amber-300 text-black/80 opacity-80 hover:opacity-100"
          }`}
        >
          Fire Deals
        </button>
      ) : null}
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

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {controls}
          {view === "table" ? (
            <div ref={columnsPortalRef} className="relative z-20 ml-auto flex justify-end min-w-[130px]" />
          ) : null}
        </div>
        {view === "table" && (
          <FirmsTable firms={firms} fireDealsMode={fireDealsMode} columnsPortalRef={columnsPortalRef} />
        )}
      </div>
      {view === "cards" ? cards : null}
    </>
  );
}
