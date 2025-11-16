import type { Pricing } from "./pricing";

export type Discount =
  | {
      label?: string | null;
      percent?: number | null;
      code?: string | null;
      expires?: string | null;
    }
  | null;

export type Firm = {
  key: string;
  name: string;

  // urls / media
  homepage?: string | null;
  signup?: string | null;
  logo?: string | null;
  url?: string | null;

  // core attributes
  model?: string | string[];
  platforms?: string[];
  trustpilot?: number | null;
  notes?: string;

  // numbers we use in UI
  maxFunding?: number | null;
  accountSize?: number | null;
  payout?: number | null;
  payoutSplit?: number | null;
  cap?: number | null;
  score?: number | null;
  minDays?: number | null;
  daysToPayout?: number | string | null;
  spreads?: string | null;

  // rules
  feeRefund?: boolean | null;
  newsTrading?: boolean | null;
  weekendHolding?: boolean | null;

  // pricing + promos
  pricing?: Pricing | null;
  discount?: Discount;
};
