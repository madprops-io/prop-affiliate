import { Plan } from "./types";

export const PLANS: Plan[] = [
  {
    key: "apex-50k-standard",
    firm: "Apex Trader Funding",
    accountSize: 50000,
    model: "2-Phase",
    platforms: ["Rithmic", "NinjaTrader", "TradingView"],
    payoutSplit: 0.9,
    evalPrice: 167,
    discount: { type: "percent", value: 50, code: "PW" },
    fees: { dataFeesMonthly: 85 },
    maxAccounts: 20,
  },
  {
    key: "fundingticks-50k-pro",
    firm: "FundingTicks",
    accountSize: 50000,
    model: "1-Phase",
    platforms: ["Tradovate"],
    payoutSplit: 0.9,
    evalPrice: 149,
    discount: { type: "percent", value: 20, code: "PW" },
    fees: { dataFeesMonthly: 0 },
    maxAccounts: 12,
  },
  // ...add more rows
];

