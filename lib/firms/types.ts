export type Model = "Instant" | "1-Phase" | "2-Phase" | "Scaling";
export type Platform = "MT4" | "MT5" | "cTrader" | "TradingView" | "NinjaTrader" | "Rithmic" | "Tradovate";

export interface Discount {
  type: "percent" | "fixed";
  value: number; // e.g., 50 -> 50% or $50
  expiresAt?: string; // ISO date (optional)
  code?: string;
}

export interface Fees {
  dataFeesMonthly?: number;   // recurring data/platform during eval
  platformFeesMonthly?: number;
  otherOneTime?: number;
}

export interface Plan {
  key: string;               // e.g., "apex-50k-standard"
  firm: string;              // "Apex Trader Funding"
  accountSize: number;       // 50000
  model: Model;
  platforms: Platform[];
  payoutSplit?: number;      // 0..1 (e.g., 0.9 for 90%)
  evalPrice: number;         // base price before discount
  discount?: Discount;
  fees?: Fees;
  maxAccounts?: number;
}

export interface PlanWithMetrics extends Plan {
  evalCost: number;          // after discount
  trueCost: number;          // evalCost + fees for the window
}
