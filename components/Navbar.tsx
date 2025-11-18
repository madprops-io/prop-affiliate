"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
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
    "transition-colors text-white/70 hover:text-white px-2 py-1 rounded-md";
  const active = "text-primary font-semibold";

  return (
    <header className={headerClass}>
      <div className="container mx-auto max-w-6xl flex items-center gap-4 px-4 py-4">
        <Link href="/" className="relative z-10 flex flex-col leading-tight group hover:opacity-95 text-left flex-shrink-0">
          <span className="text-lg md:text-2xl font-semibold uppercase tracking-[0.5em] text-[#5fffc2]">
            MADPROPS
          </span>
          <span className="text-xs italic text-[#f7d778] md:text-sm tracking-[0.2em]">
            Trade smarter.
          </span>
        </Link>

        <nav className="hidden md:flex items-center justify-center gap-4 mx-auto">
          <Link href="/" className={cn(linkBase, pathname === "/" && active)}>
            Home
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

      </div>
    </header>
  );
}
