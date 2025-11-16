// lib/pricing.ts
export type Pricing = {
  evalCost?: number | null;       // evaluation fee (USD)
  activationFee?: number | null;  // activation fee (USD)
  discount?:
    | {
        percent?: number | null;
        amount?: number | null;   // flat dollar off the eval fee
        code?: string | null;
        label?: string | null;
      }
    | null;
  discountPct?: number | null;    // legacy helpers still referencing pct directly
  feeRefund?: boolean | null;     // if eval fee refunded on first payout
};

export type CostResult = {
  evalAfterDiscount: number;
  trueCost: number;            // actual out-of-pocket cost
  trueCostAfterRefund: number; // if refund applies
};

function toNum(n: unknown, d = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
}

export function getCosts(input: { pricing?: Pricing; feeRefund?: boolean | null }): CostResult {
  const p = input.pricing ?? {};
  const evalFee = toNum((p as Pricing).evalCost ?? (p as { eval?: number }).eval, 0);
  const activation = toNum((p as Pricing).activationFee ?? (p as { activation?: number }).activation, 0);
  const discSource =
    (p as Pricing).discount?.percent ??
    (p as Pricing).discountPct ??
    (p as { discountPct?: number }).discountPct;
  let discPercent = toNum(discSource, 0);
  let discAmount = toNum((p as Pricing).discount?.amount, 0);
  // Qualifiers (e.g. BOGO) are purely informational; they should not change the math.

  // If a flat amount is provided, prefer it over percentage
  const evalAfterDiscount = discAmount > 0
    ? Math.max(0, evalFee - discAmount)
    : Math.max(0, evalFee * (1 - discPercent / 100));
  const trueCost = evalAfterDiscount + activation;

  // optional “after refund” for firms that refund the evaluation fee
  const refund = input.feeRefund || p.feeRefund ? evalAfterDiscount : 0;
  const trueCostAfterRefund = Math.max(0, trueCost - refund);

  return { evalAfterDiscount, trueCost, trueCostAfterRefund };
}
