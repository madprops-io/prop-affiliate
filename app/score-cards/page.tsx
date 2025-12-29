import type { Metadata } from "next";
import ScoreCardsClient from "../ScoreCardsClient";

export const metadata: Metadata = {
  title: "Futures Prop Firm Scorecards – Compare Rules, Payouts & Costs",
  description:
    "Filter and compare futures prop firms by payouts, drawdowns, platforms, news trading rules, and discounts. Updated regularly by MadProps.",
};

export default function ScoreCardsPage() {
  return (
    <>
      <h1 className="sr-only">Compare Futures Prop Firms</h1>
      <ScoreCardsClient />
    </>
  );
}
