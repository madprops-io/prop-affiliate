"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { buildAffiliateUrl } from "@/lib/affiliates";

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isScoreCardsRoute = pathname === "/score-cards";
  const isCardsView = isScoreCardsRoute || (pathname === "/" && searchParams?.get("view") === "cards");
  // Transparent only on the homepage and only at the very top
  const onHero = pathname === "/" && !isCardsView;

  const headerClass = cn(
    "sticky top-0 z-50 w-full transition-colors duration-300",
    onHero && !scrolled
      ? "bg-transparent border-transparent shadow-none"
      : "bg-[#0b1320]/95 backdrop-blur border-b border-white/10 shadow-sm"
  );

  const linkBase =
    "transition-colors text-white/70 hover:text-white px-2 min-h-10 inline-flex items-center rounded-md whitespace-nowrap text-sm md:text-base";
  const active = "text-primary font-semibold";

  const lucidDealHref = buildAffiliateUrl("https://lucidtrading.com", "lucidtrading", "fire-deal-banner");

  return (
    <>
      <div className="w-full bg-gradient-to-r from-[#2d1b00] via-[#3b2400] to-[#2d1b00] border-b border-amber-300/40 shadow-[0_8px_22px_-14px_rgba(255,196,86,0.7)]">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          <div className="flex items-center gap-2 text-amber-100">
            <span className="text-amber-300">Fire deal:</span>
            <span className="text-white">Lucid Flex</span>
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              40% off • Code MAD
            </span>
          </div>
          <a
            href={lucidDealHref}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-50"
          >
            <span>Tap to claim</span>
            <span className="text-[10px]">→</span>
          </a>
        </div>
      </div>
      <header className={headerClass}>
        <div className="container mx-auto max-w-6xl flex flex-col items-start gap-2 px-4 py-3 md:flex-row md:items-center md:gap-3">
          <Link
            href="/"
            className="relative z-10 flex flex-col leading-tight group hover:opacity-95 text-left flex-shrink-0"
          >
            <span className="text-base md:text-xl font-semibold uppercase tracking-[0.45em] text-[#5fffc2]">
              MADPROPS
            </span>
            <span className="text-[11px] italic text-[#f7d778] md:text-xs tracking-[0.18em]">
              Trade smarter.
            </span>
          </Link>

          <nav className="flex w-full items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 md:mx-auto md:w-auto md:justify-center md:gap-3 md:overflow-visible md:pb-0">
            <Link href="/" className={cn(linkBase, pathname === "/" && !isCardsView && active)}>
              Home
            </Link>
            <Link href="/cards" className={cn(linkBase, isCardsView && active)}>
              Score cards
            </Link>
            <Link
              href="/firms"
              className={cn(linkBase, pathname?.startsWith("/firms") && active)}
            >
              Firms
            </Link>
            <Link
              href="/calendar"
              className={cn(linkBase, pathname?.startsWith("/calendar") && active)}
            >
              Calendar
            </Link>
            <Link
              href="/disclosure"
              className={cn(linkBase, pathname?.startsWith("/disclosure") && active)}
          >
            Disclosure
          </Link>
          <Link
            href="/links"
            className={cn(linkBase, pathname === "/links" && active)}
          >
            Links
          </Link>
          <Link
            href="/learn"
            className={cn(linkBase, pathname?.startsWith("/learn") && active)}
          >
            Learn
          </Link>
        </nav>

        </div>
      </header>
    </>
  );
}
