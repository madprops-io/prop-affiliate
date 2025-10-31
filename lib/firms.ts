// lib/firms.ts

export type Firm = {
  key: string;
  name: string;
  homepage: string;
  logo: string;
  model: string[];
  platforms: string[];
  maxFunding: number;
  payout: number;

  // optional facts
  minDays?: number;
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
  lucidtrading: "TJ",
  myfundedfutures: "TJ",
  bulenox: "TJ",
  elitetraderfunding: "TJ",
  tradeify: "TJ",
  alphafutures: "TJ",
  topstep: "TJ",
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
  toponefutures:
    "https://toponefutures.com/?linkId=lp_707970&sourceId=mad&tenantId=toponefutures",

  // 🔻 Fill these in later
  tpt: "",
  daytraders: "",
  fundedfutures: "",
  legendstrading: "",
  lucidtrading: "",
  myfundedfutures: "",
  bulenox: "",
  alphafutures: "",
  topstep: "",
  fundednextfutures: "",
  aquafutures: "",
  e8futures: "",
  tradeday: "",
  phidias: "",
};

// ────────────────────────────────────────────────────────────────
// ✅ All firms (trimmed summaries; you can add more fields anytime)
export const FIRMS: Firm[] = [
  {
    key: "tpt",
    name: "Take Profit Trader",
    homepage: "https://takeprofittrader.com/",
    logo: "https://placehold.co/160x60?text=TPT",
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
    logo: "https://placehold.co/160x60?text=Apex",
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
    logo: "https://placehold.co/160x60?text=FundingTicks",
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
    logo: "https://placehold.co/160x60?text=Tradeify",
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
    logo: "https://placehold.co/160x60?text=ETF",
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
    logo: "https://placehold.co/160x60?text=Top+One",
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
  logo: "https://placehold.co/160x60?text=Daytraders",
  model: ["2-Phase"],
  platforms: ["Rithmic, ProjectX"],
  maxFunding: 200000,
  payout: 0.85,
  trustpilot: 4.5,
  founded: 2022,
  notes: "Modern UI and rapid evaluation process. No daily loss limit. EOD drawdown.",
  signup: "https://daytraders.com/",
  affiliateUrl: "https://daytraders.com/go/madprops?i=1",
},

  // 🔻 placeholders for the rest (you can expand later)
  { key: "daytraders", name: "Daytraders", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "fundedfutures", name: "Funded Futures Network", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "legendstrading", name: "Legends Trading", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "lucidtrading", name: "Lucid Trading", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "myfundedfutures", name: "My Funded Futures", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.9, signup: "" },
  { key: "bulenox", name: "Bulenox", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.85, signup: "" },
  { key: "alphafutures", name: "Alpha Futures", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.85, signup: "" },
  { key: "topstep", name: "Topstep", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "fundednextfutures", name: "FundedNext Futures", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.9, signup: "" },
  { key: "aquafutures", name: "Aqua Futures", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "e8futures", name: "E8 Futures", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.85, signup: "" },
  { key: "tradeday", name: "Trade Day", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
  { key: "phidias", name: "Phidias Propfirm", homepage: "", logo: "", model: [], platforms: [], maxFunding: 0, payout: 0.8, signup: "" },
];

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
