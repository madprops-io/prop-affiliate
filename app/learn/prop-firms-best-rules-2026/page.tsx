// app/learn/prop-firms-best-rules-2026/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Which Futures Prop Firms Have the Best Rules? (2026 Guide) | MadProps",
  description:
    "A neutral 2026 guide comparing futures prop firm rules. No rankings, no hype -- just drawdowns, payouts, and risk rules explained. Compare firms on MadProps.",
};

type FirmCard = {
  slug: string; // used for firm detail URL
  name: string;
  intro: string[];
  ruleHighlights: string[];
  payoutNotes: string[];
  bestFor: string[];
};

export default function PropFirmsBestRules2026Page() {
  const dashboardHref = "/cards"; // main dashboard route
  const firmHref = (slug: string) =>
    ({
      "apex-trader-funding": "/firm/apex",
      tradeday: "/firm/tradeday",
      "fundednext-futures": "/firm/fundednextfutures",
      "funded-futures-network": "/ffn",
      "lucid-trading": "/firm/lucidtrading",
      "top-one-futures": dashboardHref, // fallback until a dedicated page exists
    }[slug] ?? dashboardHref);

  const ARTICLES = [
    {
      title: "Best Futures Prop Firms 2026 (Top 5 Profiles, No Particular Order)",
      href: "/learn",
      summary: "Deep dive on Apex, TradeDay, FundedNext Futures, Funded Futures Network, and Lucid Trading.",
      active: false,
    },
    {
      title: "Which Futures Prop Firms Have the Best Rules? (2026 Guide)",
      href: "/learn/prop-firms-best-rules-2026",
      summary: "Neutral look at drawdowns, payouts, and rule types across major futures prop firms.",
      active: true,
    },
    {
      title: "Best Prop Firms 2026 (Futures) - Coming Soon",
      href: "/learn/best-prop-firms-2026",
      summary: "Placeholder for the fuller 2026 futures guide. Jump in to see the latest status.",
      active: false,
    },
  ];

  const firms: FirmCard[] = [
    {
      slug: "apex-trader-funding",
      name: "Apex Trader Funding",
      intro: [
        "Apex is one of the most recognizable names in the futures prop space. Traders commonly compare it based on drawdown mechanics, daily risk constraints, payout eligibility, and scaling rules.",
        "Because firms often offer multiple programs, details can vary by plan and phase. When comparing, focus on the rule categories and confirm the current rulebook for the specific program you are considering.",
      ],
      ruleHighlights: [
        "Drawdown model is often discussed in the context of trailing vs. static behavior (varies by program/phase).",
        "Daily loss limits are typically defined during evaluation phases, depending on the offering.",
        "Holding and news policies can differ by program -- confirm whether overnight or news windows are restricted.",
      ],
      payoutNotes: [
        "Payout eligibility commonly involves minimum trading days and program-specific thresholds.",
        "Some offerings may have payout caps or frequency limits -- verify current terms.",
      ],
      bestFor: [
        "Traders who want a widely used rule set to compare against the market baseline.",
        "Traders who are comfortable adapting risk management to the drawdown model used in their program.",
      ],
    },
    {
      slug: "tradeday",
      name: "TradeDay",
      intro: [
        "TradeDay is often compared for its payout accessibility and straightforward rule structure, especially for traders who care about when they can request withdrawals.",
        "As always, details can vary by plan and can change over time, so use this as a category-level comparison and confirm the current rulebook on the firm’s site.",
      ],
      ruleHighlights: [
        "Drawdown is commonly framed around end-of-day (EOD) style risk definitions (confirm program details).",
        "Daily loss limits are typically clearly stated and enforced.",
        "Session / holding rules are usually well-defined—verify news and overnight policies for your plan.",
      ],
      payoutNotes: [
        "TradeDay advertises day-one payout availability on certain offerings (confirm eligibility requirements for your plan).",
        "TradeDay is also commonly known for not using a consistency rule on certain programs—verify the current terms for your specific account type.",
        "As with all firms, review payout frequency, thresholds, and any caps or restrictions that apply after withdrawal.",
      ],
      bestFor: [
        "Traders who care about early payout access and want to compare payout rules carefully.",
        "Traders who prefer a clear rule set and want to avoid extra performance-shaping constraints (where applicable).",
      ],
    },
    {
      slug: "fundednext-futures",
      name: "FundedNext Futures",
      intro: [
        "FundedNext Futures is best compared as a program-based offering: different plans can have meaningfully different rule packages.",
        "For a fair comparison, confirm the drawdown type, whether daily loss limits apply, and how holding/news rules work for the specific plan you are viewing.",
      ],
      ruleHighlights: [
        "Drawdown structure can vary by program (trailing vs. static vs. EOD definitions).",
        "Some plans may reduce friction by relaxing certain daily constraints (program-dependent).",
        "Holding and news rules can differ by phase -- confirm what is allowed during evaluation vs. funded.",
      ],
      payoutNotes: [
        "Payout timing and requirements are plan-specific; review minimum days, thresholds, and caps.",
        "Confirm how often withdrawals are available and whether consistency-style rules apply.",
      ],
      bestFor: [
        "Traders who want options and prefer choosing a rule package that matches their style.",
        "Traders who compare firms by program design rather than brand name alone.",
      ],
    },
    {
      slug: "funded-futures-network",
      name: "Funded Futures Network",
      intro: [
        "Funded Futures Network is commonly compared based on how it defines downside risk and how payout eligibility is structured across its offerings.",
        "When evaluating, focus on drawdown type, daily loss limits, holding/news rules, and scaling/max allocation constraints.",
      ],
      ruleHighlights: [
        "Often discussed in the context of static or EOD-style drawdown frameworks on certain programs (verify current offering).",
        "Daily loss limits may be more flexible on some plans than others (program-dependent).",
        "Holding and news policies can vary by product selection -- confirm the current rulebook.",
      ],
      payoutNotes: [
        "Payout rules typically include thresholds and eligibility requirements (minimum days may apply).",
        "Confirm withdrawal frequency and any payout caps or step-ups tied to scaling.",
      ],
      bestFor: [
        "Traders who want clearly defined downside rules and a straightforward rule checklist to compare.",
        "Traders who prefer comparing multiple offerings inside a single firm ecosystem.",
      ],
    },
    {
      slug: "lucid-trading",
      name: "Lucid Trading",
      intro: [
        "Lucid Trading is often viewed as a more rules-first option where traders prioritize clarity and predictability.",
        "As with any firm, confirm the exact rule set for the plan you are considering -- especially drawdown method, daily limits, and payout eligibility.",
      ],
      ruleHighlights: [
        "Drawdown is commonly positioned as straightforward (often static or EOD-style depending on plan).",
        "Daily loss limits are typically clearly defined.",
        "Session constraints may apply -- confirm news and overnight rules if your strategy needs them.",
      ],
      payoutNotes: [
        "Payout eligibility may involve minimum days and consistency-related requirements (program-dependent).",
        "Confirm payout frequency, caps, and whether requirements change after withdrawals.",
      ],
      bestFor: [
        "Traders who want predictable limits and a clean rules framework.",
        "Traders who plan around sessions and defined daily risk boundaries.",
      ],
    },
    {
      slug: "top-one-futures",
      name: "Top One Futures",
      intro: [
        "Top One Futures represents smaller firms that can still offer meaningfully different rule structures.",
        "The right comparison approach is the same: verify drawdown type, daily limits, payout path, and holding/news rules for the specific plan.",
      ],
      ruleHighlights: [
        "Drawdown method varies by account type (confirm trailing/static/EOD).",
        "Daily loss limits are typically enforced as part of the risk model.",
        "Holding rules can be session-based -- confirm overnight/news restrictions.",
      ],
      payoutNotes: [
        "Payout rules commonly include eligibility criteria like minimum days and thresholds.",
        "Confirm payout frequency, caps, and whether scaling affects withdrawal limits.",
      ],
      bestFor: [
        "Traders who want to compare beyond only the biggest brands.",
        "Traders who prefer making decisions by rule categories, not popularity.",
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10">
      {/* Article picker */}
      <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Articles
            </p>
            <p className="text-sm text-slate-300">Choose a guide to open.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {ARTICLES.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className={`flex h-full flex-col rounded-xl border p-4 transition hover:border-emerald-300 hover:text-emerald-100 ${
                article.active ? "border-emerald-400/60 bg-emerald-400/5" : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                {article.active ? "Current" : "Open"}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white">{article.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{article.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Which Futures Prop Firms Have the Best Rules? (2026 Guide)
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">
          The firms below are listed in{" "}
          <span className="text-white">no particular order</span>. This is not a ranking, not a recommendation, and
          not financial advice. Inclusion here does not mean a firm is "better" than others. The goal is to highlight
          rule differences so you can compare what fits your strategy.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-medium text-white">What this guide compares</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-white/80">
            <li>Drawdown type (EOD vs intraday, trailing vs static)</li>
            <li>Daily loss limits</li>
            <li>Payout timing and restrictions</li>
            <li>News / overnight / holding rules</li>
            <li>Scaling and max allocation</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={dashboardHref}
            className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Compare rules on the MadProps dashboard →
          </Link>
        </div>
      </header>

      {/* Cards */}
      <section className="space-y-6">
        {firms.map((firm) => (
          <article key={firm.slug} className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-white">{firm.name}</h2>

            {firm.intro.map((paragraph, index) => (
              <p key={index} className="mt-4 text-sm leading-6 text-white/80 md:text-base md:leading-7">
                {paragraph}
              </p>
            ))}

            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-emerald-400">Rule highlights</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/80">
                  {firm.ruleHighlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-sky-400">Payout notes</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/80">
                  {firm.payoutNotes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">Best for</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/80">
                  {firm.bestFor.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={firmHref(firm.slug)} className="text-sm font-semibold text-emerald-400 hover:opacity-90">
                View {firm.name} details on MadProps →
              </Link>

              <span className="text-white/30">•</span>

              <Link href={dashboardHref} className="text-sm font-semibold text-white/80 hover:opacity-90">
                Compare on dashboard →
              </Link>
            </div>
          </article>
        ))}
      </section>

      {/* Footer */}
      <footer className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white">How to compare rules without bias</h2>
        <p className="mt-3 text-sm leading-6 text-white/80 md:text-base md:leading-7">
          Instead of asking "Which firm is best?", ask: Do trailing drawdowns change how you size? Do you need overnight
          holding? How important is payout timing versus payout flexibility? The "best rules" are the ones that match
          your strategy and risk tolerance.
        </p>

        <div className="mt-6 grid gap-3">
          <Link href="/learn/prop-firm-drawdowns" className="text-sm font-semibold text-white hover:opacity-90">
            Prop Firm Drawdowns Explained →
          </Link>
          <Link href="/learn/prop-firm-payouts" className="text-sm font-semibold text-white hover:opacity-90">
            Prop Firm Payout Rules Explained →
          </Link>
          <Link href="/learn/daily-loss-limits" className="text-sm font-semibold text-white hover:opacity-90">
            Daily Loss Limits: What Traders Miss →
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/60">
          Disclaimer: Educational content only. Not financial advice. Not a ranking. Rules change frequently; verify
          current terms on the firm’s official site.
        </p>

        <p className="mt-4 text-white/70">#MadProps</p>
      </footer>
    </main>
  );
}
