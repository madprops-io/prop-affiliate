// lib/pricing.ts
export type PricingInput = {
  pricing?: {
    evalCost?: number;
    activationFee?: number;
    discount?: { percent?: number | null } | null;
  } | null;
};

export function getCosts(f: PricingInput) {
  const evalCost = Math.max(0, f.pricing?.evalCost ?? 0);
  const activation = Math.max(0, f.pricing?.activationFee ?? 0);
  const discountPct = Math.max(0, Math.min(100, f.pricing?.discount?.percent ?? 0));

  const upFront = evalCost; // what you pay at checkout for evaluation
  const discounted = Math.round(upFront * (1 - discountPct / 100));
  const trueCost = Math.round(Math.max(0, discounted + activation)); // net to get funded (up-front after discount + activation)

  return {
    evalCost,
    activation,
    discountPct,
    discounted, // up-front after discount
    netCost: trueCost, // alias you were using in page (kept for compatibility)
    trueCost,
  };
}
