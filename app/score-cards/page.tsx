import type { Metadata } from "next";
import HomePageClient from "../HomePageClient";

export const metadata: Metadata = {
  title: "Futures Prop Firm Scorecards – Compare Rules, Payouts & Costs",
  description:
    "Filter and compare futures prop firms by payouts, drawdowns, platforms, news trading rules, and discounts. Updated regularly by MadProps.",
};

export default function ScoreCardsPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-2 space-y-1">
        <h1>Compare Futures Prop Firms</h1>
        <p className="text-sm text-white/70">
          Compare payouts, rules, platforms, discounts, and costs in one place.
        </p>
      </section>
      <HomePageClient showIntro={false} />
    </>
  );
}
