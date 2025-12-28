import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "../HomePageClient";

export const metadata: Metadata = {
  title: "Futures Prop Firm Scorecards – Compare Rules, Payouts & Costs",
  description:
    "Filter and compare futures prop firms by payouts, drawdowns, platforms, news trading rules, and discounts. Updated regularly by MadProps.",
};

export default function ScoreCardsPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1>Futures Prop Firm Scorecards</h1>
        <p>
          Compare prop firms quickly with scorecards that surface payouts, drawdowns, platforms, news
          trading policies, and discounts in one view. Use the filters to narrow the list to the
          programs that match your risk tolerance and trading style.
        </p>
        <p>
          Want more guidance? Start with{" "}
          <Link href="/best-prop-firms">best prop firms</Link>, then check{" "}
          <Link href="/best-prop-firms/day-one-payouts">day-one payouts</Link> or{" "}
          <Link href="/best-prop-firms/news-trading">news trading rules</Link> before you commit.
        </p>
        <ul>
          <li>Payout split and days-to-payout speed</li>
          <li>Drawdown type and daily loss limits</li>
          <li>Platforms, data fees, and rule restrictions</li>
        </ul>
      </section>
      <HomePageClient />
    </>
  );
}
