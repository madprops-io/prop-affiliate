import type { Metadata } from "next";

const SITE_URL = "https://www.madprops.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Best Prop Firms 2026 (Futures) - MadProps",
  description:
    "Flagship guide comparing payouts, rules, and discounts across the top futures prop firms for 2026.",
  alternates: { canonical: `${SITE_URL}/learn/best-prop-firms-2026` },
};

export default function GuideBestPropFirms2026() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6 text-white">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f6c850]">Guide</p>
        <h1 className="text-3xl font-bold">Best Prop Firms 2026 (Futures)</h1>
        <p className="text-sm text-white/70">
          Full guide coming soon. In the meantime, use MadProps to compare rules, payouts, and pricing.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p>
          We&rsquo;re drafting the full futures-focused guide: payout timelines, drawdown rules, platform support, and
          the best current discounts. Check back soon for the complete 2026 write-up.
        </p>
      </section>
    </main>
  );
}

