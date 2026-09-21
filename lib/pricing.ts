// lib/pricing.ts
export type Pricing = {
  evalCost?: number | null;       // evaluation fee (USD)
  discountedEval?: number | null; // optional exact discounted evaluation price (USD)
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
  trueCost: number | null;            // actual out-of-pocket cost; null when activation is unknown
  trueCostAfterRefund: number | null; // retained for compatibility; refund is included in trueCost
  discountPct: number;         // normalized percentage off (0-100)
};

function toNum(n: unknown, d = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
}

export function getCosts(input: { pricing?: Pricing; feeRefund?: boolean | null }): CostResult {
  const p = input.pricing ?? {};
  const evalFee = toNum((p as Pricing).evalCost ?? (p as { eval?: number }).eval, 0);
  const discountedEvalSource = (p as Pricing).discountedEval;
  const discountedEval =
    typeof discountedEvalSource === "number" && Number.isFinite(discountedEvalSource) && discountedEvalSource >= 0
      ? discountedEvalSource
      : null;
  const activationSource = (p as Pricing).activationFee ?? (p as { activation?: number | null }).activation;
  const activation =
    typeof activationSource === "number" && Number.isFinite(activationSource) && activationSource >= 0
      ? activationSource
      : null;
  const discSource =
    (p as Pricing).discount?.percent ??
    (p as Pricing).discountPct ??
    (p as { discountPct?: number }).discountPct;
  const discPercent = Math.max(0, Math.min(100, toNum(discSource, 0)));
  const discAmount = Math.max(0, toNum((p as Pricing).discount?.amount, 0));
  // Qualifiers (e.g. BOGO) are purely informational; they should not change the math.

  // If a flat amount is provided, prefer it over percentage
  const evalAfterDiscount =
    discountedEval ??
    (discAmount > 0 ? Math.max(0, evalFee - discAmount) : Math.max(0, evalFee * (1 - discPercent / 100)));
  const amountAsPct = discAmount > 0 && evalFee > 0 ? Math.min(100, (discAmount / evalFee) * 100) : 0;
  const discountPct = discAmount > 0 ? amountAsPct : discPercent;

  // optional “after refund” for firms that refund the evaluation fee
  const refund = input.feeRefund === true || p.feeRefund === true ? evalAfterDiscount : 0;
  const trueCost = activation === null ? null : Math.max(0, evalAfterDiscount + activation - refund);
  const trueCostAfterRefund = trueCost;

  return { evalAfterDiscount, trueCost, trueCostAfterRefund, discountPct };
}
