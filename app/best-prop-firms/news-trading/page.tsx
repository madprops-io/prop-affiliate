import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Best Futures Prop Firms That Allow News Trading (2026) - Policy Comparison",
  description:
    "Learn how futures prop firms handle news trading, which events are restricted, and how to trade around releases without violating rules.",
};

export default function NewsTradingPage() {
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
        name: "News Trading",
        item: `${baseUrl}/best-prop-firms/news-trading`,
      },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is news trading?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "News trading is placing trades around market-moving releases or unexpected headlines that can spike volatility.",
        },
      },
      {
        "@type": "Question",
        name: "Why do some prop firms block trading during news?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Fast price movement can increase slippage and risk-limit violations, so firms restrict trading to manage exposure.",
        },
      },
      {
        "@type": "Question",
        name: "Does “news trading allowed” mean no restrictions?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "No. Most firms still define time windows or order-type limits, so you should check the policy.",
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
        <h1>Best Futures Prop Firms That Allow News Trading (2026)</h1>
        <p>
          News trading includes sessions around major releases like NFP, CPI, and FOMC. Compare
          futures prop firms by payouts, rules, platforms, and discounts.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Compare with Scorecards</h2>
        <p className="text-sm text-white/70">
          Use the scorecards to filter by news trading rules, drawdowns, and payout timing so you can
          align policies with your strategy.
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
        <h2>Typical news trading restrictions</h2>
        <p>
          Many firms restrict new orders during a window before and after scheduled releases. Some
          allow open positions but block new entries, while others require you to be flat. Always
          confirm how rules apply to evaluation versus funded accounts.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Blocked trading windows around major releases</li>
          <li>Limits on order types during volatile periods</li>
          <li>Different rules for evaluations and funded accounts</li>
          <li>Contract-specific restrictions</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>How to trade news responsibly in prop accounts</h2>
        <p>
          Use a release calendar, size down, and avoid market orders during the initial spike. If a
          firm allows holding through releases, confirm how the daily loss limit is enforced during
          volatile moves.
        </p>
      </section>

      <section className="space-y-3">
        <h2>Related guides</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link href="/best-prop-firms">Best prop firms overview</Link>
          </li>
          <li>
            <Link href="/best-prop-firms/day-one-payouts">Day-one payouts guide</Link>
          </li>
          <li>
            <Link href="/best-prop-firms/no-consistency-rule">No consistency rule guide</Link>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>FAQs</h2>
        <h3>What is news trading?</h3>
        <p>
          News trading is placing trades around market-moving releases or unexpected headlines that
          can spike volatility.
        </p>
        <h3>Why do some prop firms block trading during news?</h3>
        <p>
          Rapid price movement can increase slippage and risk-limit violations, so firms restrict
          trading to manage exposure.
        </p>
        <h3>Does “news trading allowed” mean no restrictions?</h3>
        <p>
          No. Most firms still define time windows or order-type limits. Always check the written
          policy.
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
