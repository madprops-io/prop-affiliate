export type Firm = {
  key: string;                 // slug like "daytraders"
  name: string;
  homepage?: string;           // public site
  signup?: string;             // affiliate/sign-up url
  logo?: string;               // /logos/<key>.png (optional)
  model?: string[];            // ["1-Phase","S2F",...]
  platforms?: string[];        // ["NinjaTrader","Rithmic",...]
  notes?: string;
  trustpilot?: number;         // e.g. 4.7
  weekendHolding?: boolean;    // yes/no flag
};
