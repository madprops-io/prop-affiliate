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
        <p className="text-sm text-white/70">
          A concise placeholder for the full article. Replace this with your long-form guide content. Include sections
          on payouts, drawdown rules, platform support, and current discounts. Keep links pointing to your score cards
          and firm detail pages for internal linking strength.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-white">What to include when you paste the full article</h2>
        <ul className="list-disc space-y-1 pl-4 text-sm text-white/70">
          <li>Overview of futures-focused prop firms and who they fit.</li>
          <li>Table or bullets for payouts, first payout timing, and fees.</li>
          <li>Drawdown rules (static vs trailing) and scaling plans.</li>
          <li>Discount codes and links back to your deals/score cards.</li>
          <li>Platforms supported (TradingView, Rithmic, NinjaTrader, etc.).</li>
        </ul>
        <p className="text-sm text-white/60">
          When you paste your full draft, keep headings in H2/H3 structure and ensure any structured data (JSON-LD)
          points to <code>/learn/best-prop-firms-2025</code>.
        </p>
      </section>
    </main>
  );
}
