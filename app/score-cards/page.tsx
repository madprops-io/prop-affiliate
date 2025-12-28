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
      <section className="mx-auto max-w-3xl px-6 pt-8 pb-4">
        <h1>Futures Prop Firm Scorecards</h1>
        <p>Compare futures prop firms by payouts, rules, platforms, and discounts.</p>
      </section>
      <HomePageClient />
    </>
  );
}
