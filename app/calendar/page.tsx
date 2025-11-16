"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#040a18] via-[#030713] to-black text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-12">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/90">Macro radar</p>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold leading-tight">Economic calendar &amp; event monitor</h1>
              <p className="mt-3 max-w-3xl text-sm text-white/70">
                Keep the TradingView feed open next to the comparison table so you never trade blind into the next red-folder
                release.
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200 hover:text-emerald-100"
            >
              &larr; Back to deals
            </Link>
          </div>
        </header>

        <EconomicCalendarWidget />
      </div>
    </div>
  );
}

function EconomicCalendarWidget() {
  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!calendarRef.current) return;
    if (calendarRef.current.querySelector("script")) return; // guard duplicate mounts
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: false,
      width: "100%",
      height: 540,
      locale: "en",
      importanceFilter: "-1,0,1",
    });
    calendarRef.current.appendChild(script);
  }, []);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/80 shadow-[0_50px_120px_-80px_black]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Live feed</p>
          <h2 className="text-2xl font-semibold text-white">TradingView economic events</h2>
          <p className="text-white/60">
            Filter for impact levels and stay synced with your browser timezone so you can plan payout requests, challenges,
            and trade entries.
          </p>
        </div>
        <Link
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-emerald-200 hover:text-emerald-100"
        >
          TradingView source
        </Link>
      </div>
      <div className="tradingview-widget-container" ref={calendarRef}>
        <div className="tradingview-widget-container__widget" />
        <div className="tradingview-widget-copyright text-xs text-white/50">
          <span>Calendar provided by TradingView</span>
        </div>
      </div>
    </section>
  );
}
