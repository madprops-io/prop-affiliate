"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackToResults() {
  const sp = useSearchParams();
  const qs = sp.toString();
  const href = qs ? `/?${qs}` : "/";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={16} />
      Back to results
    </Link>
  );
}
