import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Prop Firms 2025 (Futures) - MadProps",
  description: "Flagship guide comparing payouts, rules, and discounts across the top futures prop firms for 2025.",
  alternates: { canonical: "https://www.madprops.com/learn/best-prop-firms-2025" },
};

export default function GuideBestPropFirms2025() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f6c850]">Guide</p>
        <h1 className="text-3xl font-bold text-white">Best Prop Firms 2025 (Futures)</h1>
        <p className="text-sm text-white/70">Full guide coming soon. Check back for the 2025 breakdown.</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p>
          We&rsquo;re drafting the full futures-focused guide: payouts, drawdown rules, platform support, and the best
          current discounts. Come back soon for the complete write-up.
        </p>
      </section>
    </main>
  );
}
