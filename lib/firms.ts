// lib/firms.ts

import { normalizeModelList } from "./modelTags";

export type Firm = {
  key: string;
  name: string;
  homepage: string;
  logo: string;
  model: string[];
  platforms: string[];
  maxFunding: number;
  maxAccounts?: number;
  accountSize?: number;
  payout: number;

  // optional facts
  minDays?: number;
  daysToPayout?: number | string | null;
  drawdownType?: string | null;
  spreads?: string;
  feeRefund?: boolean;
  newsTrading?: boolean;
  weekendHolding?: boolean;
  trustpilot?: number;
  founded?: number;
  notes?: string;

  // links
  signup: string;
  affiliateUrl?: string; // ✅ direct affiliate link if you prefer per-firm

  // pricing & discounts
  pricing?: {
    evalFee: number;
    activationFee?: number;
    refundEligible?: boolean;
  };
  discount?: {
    label: string;
    percent: number;
    code?: string;
    expires?: string;
  };
};

// ────────────────────────────────────────────────────────────────
// Legacy affiliate codes (you can still keep these if needed)
export const AFFILIATE_CODES: Record<string, string> = {
  DEFAULT: "MADPROPS",
  blueguardian: "885",
  funderpro: "44803",
  tradingfunds: "1125",
  fundingticks: "TJ",
  tpt: "TJ",
  apex: "TJ",
  daytraders: "madprops",
  fundedfutures: "TJ",
  legendstrading: "TJ",
  lucidtrading: "MAD",
  myfundedfutures: "TJ",
  bulenox: "TJ",
  elitetraderfunding: "TJ",
  tradeify: "TJ",
  alphafutures: "TJ",
  toponefutures: "TJ",
  fundednextfutures: "TJ",
  aquafutures: "TJ",
  e8futures: "TJ",
  tradeday: "TJ",
  phidias: "TJ",
};

// ────────────────────────────────────────────────────────────────
// ✅ Centralized affiliate URLs – fill in as you get each link
export const AFFILIATE_LINKS: Record<string, string> = {
  apex: "https://apextraderfunding.com/?ref=MADPROPS",
  blueguardian: "https://checkout.blueguardianfutures.com/ref/885/",
  funderpro: "https://funderpro.cxclick.com/visit/?bta=44803&brand=funderpro",
  tradingfunds: "https://tradingfunds.com/aff/1125/",
  fundingticks: "https://fundingticks.com/signup?ref=TJ",
  daytraders: "https://daytraders.com/go/madprops?i=1",
  tradeify: "https://tradeify.co/?ref=MADPROPS",
  elitetraderfunding: "https://elitetraderfunding.app/?ref=MADPROPS",
  lucidtrading: "https://lucidtrading.com",
  toponefutures:
    "https://toponefutures.com/?linkId=lp_707970&sourceId=mad&tenantId=toponefutures",

  // 🔻 Fill these in later (unique keys, no duplicates)
  tpt: "",
  fundedfutures: "",
  legendstrading: "",
  lucidtrading: "",
  myfundedfutures: "",
  bulenox: "",
  alphafutures: "",
  fundednextfutures: "https://fundednext.com/?fpr=troy49",
  aquafutures: "",
  e8futures: "",
  tradeday: "",
  phidias: "",
};

// ────────────────────────────────────────────────────────────────
// ✅ All firms (trimmed summaries; you can add more fields anytime)
const RAW_FIRMS: Firm[] = [
  {
    key: "tpt",
    name: "Take Profit Trader",
    homepage: "https://takeprofittrader.com/",
    logo: "/logos/tpt.png",
    model: ["2-Phase"],
    platforms: ["NinjaTrader"],
    maxFunding: 150000,
    payout: 0.8,
    minDays: 5,
    notes: "Affordable futures evaluation accounts.",
    signup: "https://takeprofittrader.com/",
  },
  {
    key: "apex",
    name: "Apex Trader Funding",
    homepage: "https://apextraderfunding.com/",
    logo: "/logos/apex.png",
    model: ["1-Phase", "Scaling"],
    platforms: ["Rithmic", "NinjaTrader"],
    maxFunding: 300000,
    payout: 0.9,
    trustpilot: 4.7,
    notes: "High payout futures prop firm with flexible scaling options.",
    signup: "https://apextraderfunding.com/",
  },
  {
    key: "fundingticks",
    name: "FundingTicks",
    homepage: "https://fundingticks.com/",
    logo: "/logos/fundingticks.png",
    model: ["2-Phase"],
    platforms: ["TradingView"],
    maxFunding: 200000,
    payout: 0.9,
    notes: "TradingView-native futures evaluation platform.",
    signup: "https://fundingticks.com/signup",
  },
  {
    key: "tradeify",
    name: "Tradeify",
    homepage: "https://tradeify.co/",
    logo: "/logos/tradeify.png",
    model: ["Instant", "1-Phase"],
    platforms: ["MT5", "cTrader"],
    maxFunding: 200000,
    payout: 0.8,
    trustpilot: 4.6,
    notes: "Modern UI and transparent rulebook.",
    signup: "https://tradeify.co/",
  },
  {
    key: "elitetraderfunding",
    name: "Elite Trader Funding",
    homepage: "https://elitetraderfunding.app/",
    logo: "/logos/etf.png",
    model: ["1-Phase"],
    platforms: ["Rithmic"],
    maxFunding: 250000,
    payout: 0.9,
    notes: "Simple one-phase evaluation, quick payouts.",
    signup: "https://elitetraderfunding.app/",
  },
  {
    key: "toponefutures",
    name: "Top One Futures",
    homepage: "https://www.toponefutures.com/",
    logo: "/logos/topone.png",
    model: ["1-Step", "Instant", "S2F", "Ignite"],
    platforms: ["Rithmic"],
    maxFunding: 200000,
    payout: 0.85,
    notes: "Multiple program options: ELITE, Instant, S2F, Ignite.",
    signup: "https://www.toponefutures.com/",
  },
  {
    key: "daytraders",
    name: "Daytraders",
    homepage: "https://daytraders.com/",
    logo: "/logos/daytraders.png",
    model: ["2-Phase"],
    platforms: ["Rithmic", "ProjectX"], // ✅ two separate items
    maxFunding: 200000,
    payout: 0.85,
    trustpilot: 4.5,
    founded: 2022,
    notes:
      "Modern UI and rapid evaluation process. No daily loss limit. EOD drawdown.",
    signup: "https://daytraders.com/",
    affiliateUrl: "https://daytraders.com/go/madprops?i=1",
  },

  // 🔻 placeholders for the rest (you can expand later)
  {
    key: "blueguardian",
    name: "Blue Guardian Futures",
    homepage: "https://blueguardianfutures.com/",
    logo: "/logos/blueguardian.png",
    model: ["1-Phase", "Accelerated"],
    platforms: ["Rithmic", "NinjaTrader"],
    maxFunding: 200000,
    payout: 0.85,
    trustpilot: 4.7,
    notes: "Clean dashboard, optional accelerated payouts, and frequent discount drops.",
    signup: "https://checkout.blueguardianfutures.com/ref/885/",
  },
  {
    key: "funderpro",
    name: "FunderPro",
    homepage: "https://funderpro.com/",
    logo: "/logos/funderpro.png",
    model: ["2-Phase"],
    platforms: ["cTrader", "MT5"],
    maxFunding: 200000,
    payout: 0.8,
    notes: "Global brand branching into futures with heavy emphasis on trader support.",
    signup: "https://funderpro.cxclick.com/visit/?bta=44803&brand=funderpro",
  },
  {
    key: "tradingfunds",
    name: "TradingFunds",
    homepage: "https://tradingfunds.com/",
    logo: "/logos/tradingfunds.png",
    model: ["1-Phase", "2-Phase"],
    platforms: ["Rithmic"],
    maxFunding: 200000,
    payout: 0.85,
    notes: "Straightforward rules, transparent resets, and consistent promo cadence.",
    signup: "https://tradingfunds.com/aff/1125/",
  },
  { key: "fundedfutures", name: "Funded Futures Network", homepage: "", logo: "/logos/ffn.png", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "legendstrading", name: "Legends Trading", homepage: "", logo: "/logos/legends.png", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  {
    key: "lucidtrading",
    name: "Lucid Trading",
    homepage: "https://lucidtrading.com/",
    logo: "/logos/lucid.png",
    model: [],
    platforms: [],
    maxFunding: 0,
    payout: 0.8,
    signup: "https://lucidtrading.com/",
  },
  { key: "myfundedfutures", name: "My Funded Futures", homepage: "", logo: "/logos/mff.png", model: [], platforms: [], maxFunding: 0, payout: 0.9, signup: "" },
  { key: "bulenox", name: "Bulenox", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.85, signup: "" },
  { key: "alphafutures", name: "Alpha Futures", homepage: "", logo: "/logos/alpha.png", model: [], platforms: [], maxFunding: 0, payout: 0.85, signup: "" },
  {
    key: "fundednextfutures",
    name: "FundedNext Futures",
    homepage: "https://fundednext.com/futures",
    logo: "/logos/fundednext.png",
    model: [],
    platforms: [],
    maxFunding: 0,
    payout: 0.9,
    signup: "https://fundednext.com/futures",
  },
  { key: "aquafutures", name: "Aqua Futures", homepage: "", logo: "/logos/aqua.png", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "e8futures", name: "E8 Futures", homepage: "", logo: "/logos/e8.png", model: [], platforms: [], maxFunding: 0, payout: 0.85, signup: "" },
  { key: "tradeday", name: "Trade Day", homepage: "", logo: "/logos/tradeday.png", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "phidias", name: "Phidias Propfirm", homepage: "", logo: "/logos/phidias.png", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
];

export const FIRMS: Firm[] = RAW_FIRMS.map((firm) => ({
  ...firm,
  model: normalizeModelList(firm.model),
}));

// ────────────────────────────────────────────────────────────────
// Helpers
export type FirmKey = (typeof FIRMS)[number]["key"];

export function getAllFirmKeys() {
  return FIRMS.map((f) => f.key);
}

export function getFirmByKey(key: string) {
  return FIRMS.find((f) => f.key === key);
}

// ✅ Central link selector for buttons
export function getSignupLink(firm: Firm): string {
  const fromMap = AFFILIATE_LINKS[firm.key];
  if (fromMap && fromMap.trim()) return fromMap;
  if (firm.affiliateUrl && firm.affiliateUrl.trim()) return firm.affiliateUrl;
  return firm.signup;
}
