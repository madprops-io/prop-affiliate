// app/firms/page.tsx (Server Component)
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FIRMS } from "@/lib/firms";
import { FirmCard } from "@/components/FirmCard";
import FirmsViewToggle from "./FirmsViewToggle"; // client component

export const metadata: Metadata = {
  title: "All Firms • MadProps",
  description: "Browse every proprietary trading firm we track, all in one place.",
  alternates: { canonical: "/firms" },
};

export default async function FirmsIndexPage({
  searchParams,
}: {
  // Next 15: searchParams is a Promise on server components
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sorted = [...FIRMS].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="container mx-auto max-w-6xl p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">All Firms</h1>
        <p className="text-muted-foreground">
          Full list of firms we track. Use the home page to filter/sort — or switch to the{" "}
          <Link href="/firms?view=table" className="underline">
            sortable table
          </Link>.
        </p>
      </header>

      {/* Wrap the client component in Suspense for safety */}
      <Suspense fallback={<section className="p-6">Loading…</section>}>
        <FirmsViewToggle
          initialSearchParams={sp}
          fallbackCards={
            <section
              aria-label="All prop firms"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {sorted.map((f) => (
                <FirmCard key={f.key} firm={f as any} />
              ))}
            </section>
          }
        />
      </Suspense>
    </main>
  );
}
