import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Best Futures Prop Firms (2026) - Compare Rules, Payouts & Discounts",
  description:
    "Explore the best futures prop firms for 2026 with clear comparisons of rules, payouts, drawdowns, fees, and discounts in one practical guide.",
};

export default function BestPropFirmsPage() {
  const baseUrl = "https://www.madprops.com";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Best Prop Firms",
        item: `${baseUrl}/best-prop-firms`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Best Futures Prop Firms (2026)",
        item: `${baseUrl}/best-prop-firms`,
      },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What makes a prop firm a good fit?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "A good fit balances payout access with rules you can follow consistently, including drawdowns and daily loss limits.",
        },
      },
      {
        "@type": "Question",
        name: "Do lower fees always mean better value?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Not necessarily. Lower fees can help, but restrictive rules may slow payouts and raise total cost over time.",
        },
      },
      {
        "@type": "Question",
        name: "Should I choose based on payout split alone?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "No. Payout split is only one factor; drawdown rules and payout eligibility often matter more.",
        },
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd, faqJsonLd]),
        }}
      />
      <section className="space-y-3">
        <h1>Best Futures Prop Firms (2026)</h1>
        <p>
          Use this guide to understand how futures prop firm programs differ in rules, costs, and
          payout access. Compare futures prop firms by payouts, rules, platforms, and discounts.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Compare with Scorecards</h2>
        <p className="text-sm text-white/70">
          Want the fastest way to narrow your options? Use the scorecards to filter by payout terms,
          drawdowns, platforms, and discounts.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/score-cards"
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Compare with Scorecards
          </Link>
          <Link href="/" className="text-sm underline underline-offset-4 opacity-90 hover:opacity-100">
            Quick table view<span className="ml-2 text-xs opacity-70">Sortable overview</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2>How to compare futures prop firms</h2>
        <p>
          The best option is the one that matches your trading style and risk tolerance. Start by
          checking the drawdown model and daily loss limits, then weigh payout timing and fees. A
          large account size does not help if the rules make it hard to reach payout eligibility.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Payout split, payout timing, and minimum profit thresholds</li>
          <li>Drawdown type, daily loss limits, and rule clarity</li>
          <li>Platforms, data fees, and execution constraints</li>
          <li>Discounts, resets, and total monthly cost</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>Related guides</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link href="/best-prop-firms/day-one-payouts">Day-one payouts guide</Link>
          </li>
          <li>
            <Link href="/best-prop-firms/no-consistency-rule">No consistency rule guide</Link>
          </li>
          <li>
            <Link href="/best-prop-firms/news-trading">News trading rules guide</Link>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>FAQs</h2>
        <h3>What makes a prop firm a good fit?</h3>
        <p>
          A good fit balances payout access with rules you can follow consistently. Focus on
          drawdowns, daily loss limits, and how quickly you can request payouts.
        </p>
        <h3>Do lower fees always mean better value?</h3>
        <p>
          Not necessarily. Lower fees help, but a restrictive rule set can slow payouts and raise
          total cost over time.
        </p>
        <h3>Should I choose based on payout split alone?</h3>
        <p>
          No. Payout split is only one factor. The rules and drawdown model often have a bigger
          impact on your ability to reach payouts.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 flex flex-wrap gap-3 items-center justify-between">
        <span className="text-sm text-white/70">Ready to compare programs?</span>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/score-cards" className="underline underline-offset-4">
            Scorecards
          </Link>
          <Link href="/firms" className="underline underline-offset-4">
            All firms
          </Link>
          <Link href="/links" className="underline underline-offset-4">
            Links and deals
          </Link>
        </div>
      </section>
    </main>
  );
}
