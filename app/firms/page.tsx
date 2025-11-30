// app/firms/page.tsx (Server Component)
import type { Metadata } from "next";
import Link from "next/link";
import { FIRMS } from "@/lib/firms";
import type { Firm } from "@/lib/types";
import { FirmDirectoryCards } from "./FirmDirectoryCards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Firms - MadProps",
  description: "Browse every proprietary trading firm we track, all in one place.",
  alternates: { canonical: "/firms" },
};

const slugifyKey = (value?: string | null) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

type FirmsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function FirmsIndexPage({ searchParams }: FirmsPageProps) {
  const sorted: Firm[] = [...FIRMS].sort((a, b) => a.name.localeCompare(b.name));
  const rawFirmParam = typeof searchParams?.firm === "string" ? searchParams.firm : null;
  const initialFirm = rawFirmParam ? slugifyKey(rawFirmParam) || null : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#040912] via-[#02050a] to-[#010307] text-white">
      <section className="border-b border-white/5 bg-gradient-to-br from-[#050a16] via-[#040a18] to-[#030712]">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-12 text-center">
          <span className="text-xs uppercase tracking-[0.45em] text-emerald-300/80">Directory</span>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Curated prop firms with expandable receipts.
          </h1>
          <p className="mx-auto max-w-3xl text-base text-white/70">
            Quick-scan cards up top, deep payouts + rules inside each fold-out. Need the spreadsheet view?{" "}
            <Link href="/?view=table#comparison" className="text-emerald-300 underline">
              Jump to the sortable table
            </Link>
            . Prefer the scoring view?{" "}
            <Link href="/?view=cards" className="text-emerald-300 underline">
              Open the score cards
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 py-10 space-y-6">
        <FirmDirectoryCards firms={sorted} initialExpandedKey={initialFirm} />
      </section>
    </main>
  );
}


