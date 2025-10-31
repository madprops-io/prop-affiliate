"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export default function AffiliateNotice({ className }: Props) {
  const [hidden, setHidden] = useState(true); // start hidden to avoid SSR flash

  // Show unless the user dismissed it for this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem("affNoticeHidden") === "1";
    setHidden(dismissed);
  }, []);

  if (hidden) return null;

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border border-white/5 bg-card/50 backdrop-blur-sm",
        "text-muted-foreground px-3 py-2 sm:px-4 sm:py-2.5",
        "shadow-none flex items-start gap-2 sm:gap-3",
        className
      )}
      role="note"
      aria-label="Affiliate disclosure"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
      <p className="text-xs sm:text-sm leading-relaxed">
        <span className="font-medium text-foreground/80">Disclosure:</span>{" "}
        Some links on this site are affiliate links. If you sign up through
        them, we may earn a commission at no additional cost to you.{" "}
        <Link href="/disclosure" className="underline hover:text-foreground">
          Learn more
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem("affNoticeHidden", "1");
          setHidden(true);
        }}
        className="ml-auto rounded px-2 py-1 text-xs text-foreground/70 hover:text-foreground hover:bg-foreground/5"
        aria-label="Dismiss disclosure for this session"
      >
        Dismiss
      </button>
    </div>
  );
}
