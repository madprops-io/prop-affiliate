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

  // Transparent only on the homepage and only at the very top
  const onHero = pathname === "/";

  const headerClass = cn(
    "sticky top-0 z-50 w-full transition-colors duration-300",
    onHero && !scrolled
      ? "bg-transparent border-transparent shadow-none"
      : "bg-[#0b1320]/95 backdrop-blur border-b border-white/10 shadow-sm"
  );

  const linkBase =
    "transition-colors text-white/70 hover:text-white px-2 py-1 rounded-md whitespace-nowrap text-sm md:text-base";
  const active = "text-primary font-semibold";

  const isCardsView = pathname === "/" && searchParams?.get("view") === "cards";
  const lucidDealHref = buildAffiliateUrl("https://lucidtrading.com", "lucidtrading", "fire-deal-banner");

  return (
    <header className={headerClass}>
      <div className="container mx-auto max-w-6xl flex flex-col items-start gap-3 px-4 py-4 md:flex-row md:items-center md:gap-4">
        <Link
          href="/"
          className="relative z-10 flex flex-col leading-tight group hover:opacity-95 text-left flex-shrink-0"
        >
          <span className="text-lg md:text-2xl font-semibold uppercase tracking-[0.5em] text-[#5fffc2]">
            MADPROPS
          </span>
          <span className="text-xs italic text-[#f7d778] md:text-sm tracking-[0.2em]">
            Trade smarter.
          </span>
        </Link>

        <nav className="flex w-full items-center gap-3 overflow-x-auto pb-1 -mx-2 px-2 md:mx-auto md:w-auto md:justify-center md:gap-4 md:overflow-visible md:pb-0">
          <Link href="/" className={cn(linkBase, pathname === "/" && !isCardsView && active)}>
            Home
          </Link>
          <Link
            href="/?view=cards"
            className={cn(linkBase, isCardsView && active)}
          >
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
        </nav>

        <a
          href={lucidDealHref}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="group flex w-full items-center gap-2 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-[#1a1204] via-[#2d1b00] to-[#1a1204] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200 shadow-[0_12px_30px_-18px_rgba(255,196,86,0.6)] transition hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-100 md:w-auto"
        >
          <span className="text-amber-300">Fire deal:</span>
          <span className="text-white group-hover:text-amber-50">Lucid Trading</span>
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
            40% off • Code MAD
          </span>
          <span className="text-[10px] text-amber-100/80">Tap to claim</span>
        </a>
      </div>
    </header>
  );
}
