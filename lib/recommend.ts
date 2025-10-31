// lib/recommend.ts
import type { Firm } from "./firms";

function intersect(a: string[] = [], b: string[] = []) {
  return a.filter((x) => b.includes(x));
}

export function recommendRelatedFirms(
  target: Firm,
  universe: Firm[],
  opts: { limit?: number } = {}
): Firm[] {
  const limit = opts.limit ?? 3;

  const results = universe
    .filter((f) => f.key !== target.key)
    .map((f) => {
      const modelInter = intersect(target.model, f.model).length;     // strong
      const platInter = intersect(target.platforms, f.platforms).length; // medium
      const boolOverlap =
        (target.newsTrading && f.newsTrading ? 1 : 0) +
        (target.weekendHolding && f.weekendHolding ? 1 : 0) +
        (target.feeRefund && f.feeRefund ? 1 : 0);

      const payoutDelta = Math.abs((target.payout ?? 0) - (f.payout ?? 0));
      const tpDelta = Math.abs((target.trustpilot ?? 0) - (f.trustpilot ?? 0));

      // Weighted score (tweak as you like)
      const score =
        modelInter * 0.6 +
        platInter * 0.35 +
        boolOverlap * 0.25 -
        payoutDelta * 0.1 -
        tpDelta * 0.05;

      return { firm: f, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.firm);

  return results;
}
