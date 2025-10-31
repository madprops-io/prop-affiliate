import { Plan, PlanWithMetrics } from "./types";

export function applyDiscount(base: number, d?: Plan["discount"]) {
  if (!d) return base;
  if (d.type === "percent") return Math.max(0, base * (1 - d.value / 100));
  return Math.max(0, base - d.value);
}

/**
 * Compute evalCost and trueCost.
 * - windowMonths: how many months of eval/platform fees you want to include in “true cost”.
 *   Common choices: 1 (strict eval month) or 2 (eval plus first funded month).
 */
export function withMetrics(plan: Plan, windowMonths = 1): PlanWithMetrics {
  const evalCost = round2(applyDiscount(plan.evalPrice, plan.discount));

  const m = plan.fees ?? {};
  const monthly = (m.dataFeesMonthly ?? 0) + (m.platformFeesMonthly ?? 0);
  const trueCost = round2(evalCost + monthly * windowMonths + (m.otherOneTime ?? 0));

  return { ...plan, evalCost, trueCost };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
