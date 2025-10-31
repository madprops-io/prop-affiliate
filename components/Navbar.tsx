"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

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
    onHero && !scrolled ? "absolute inset-x-0 top-0" : "sticky top-0",
    "z-50 w-full transition-colors duration-300",
    onHero && !scrolled
      ? "bg-transparent border-transparent shadow-none"
      : "bg-[#0b1320]/95 backdrop-blur border-b border-white/10 shadow-sm"
  );

  const linkBase =
    "transition-colors text-white/70 hover:text-white px-2 py-1 rounded-md";
  const active = "text-primary font-semibold";

  return (
    <header className={headerClass}>
      <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="relative z-10 flex items-center gap-3 group hover:opacity-95">
<Image
  src="/logo-mark.png"
  alt="MadProps logo"
  width={80}
  height={80}
  className="mr-2 -mt-1 drop-shadow-[0_0_10px_rgba(95,255,194,0.35)]"
  priority
/>
          <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            <span className="text-white">Mad</span>
            <span className="text-primary drop-shadow-[0_0_12px_rgba(0,200,155,0.35)]">
              Props
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-3">
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
            href="/disclosure"
            className={cn(linkBase, pathname?.startsWith("/disclosure") && active)}
          >
            Disclosure
          </Link>
        </nav>

        <Button
          asChild
          size="sm"
          className="relative z-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_rgba(255,255,255,.12)_inset,0_6px_20px_-8px_rgba(0,0,0,.5)]"
        >
          <Link href="/#top" className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            <span>Compare</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
