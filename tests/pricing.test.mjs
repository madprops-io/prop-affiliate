import assert from "node:assert/strict";
import test from "node:test";

import { parseOptionalNumber } from "../lib/csvNumbers.ts";
import { getCosts } from "../lib/pricing.ts";

const pricingFromCsv = ({ evalCost, discountPct, discountedEval, activationFee, feeRefund = false }) =>
  getCosts({
    pricing: {
      evalCost: parseOptionalNumber(evalCost),
      discountedEval: parseOptionalNumber(discountedEval),
      activationFee: parseOptionalNumber(activationFee),
      discount: { percent: parseOptionalNumber(discountPct) },
    },
    feeRefund,
  });

test("blank optional numbers stay undefined while literal zero is preserved", () => {
  assert.equal(parseOptionalNumber(undefined), undefined);
  assert.equal(parseOptionalNumber(""), undefined);
  assert.equal(parseOptionalNumber("   "), undefined);
  assert.equal(parseOptionalNumber("0"), 0);
  assert.equal(parseOptionalNumber("$0.00"), 0);
});

test("Alpha Zero 50K falls back to its percentage discount", () => {
  const costs = pricingFromCsv({
    evalCost: "139",
    discountPct: "40",
    discountedEval: "",
    activationFee: "0",
  });

  assert.equal(costs.evalAfterDiscount, 83.4);
  assert.equal(costs.trueCost, 83.4);
});

test("Apex Intraday 50K falls back to its percentage discount", () => {
  const costs = pricingFromCsv({
    evalCost: "490",
    discountPct: "90",
    discountedEval: "",
    activationFee: "0",
  });

  assert.ok(Math.abs(costs.evalAfterDiscount - 49) < 1e-9);
  assert.ok(Math.abs((costs.trueCost ?? 0) - 49) < 1e-9);
});

test("Legends Apprentice 50K adds activation to its exact discounted evaluation", () => {
  const costs = pricingFromCsv({
    evalCost: "185",
    discountPct: "80",
    discountedEval: "37",
    activationFee: "99",
  });

  assert.equal(costs.evalAfterDiscount, 37);
  assert.equal(costs.trueCost, 136);
});

test("Lucid Pro 25K uses its exact discounted evaluation", () => {
  const costs = pricingFromCsv({
    evalCost: "123",
    discountPct: "30",
    discountedEval: "70.6",
    activationFee: "0",
  });

  assert.equal(costs.evalAfterDiscount, 70.6);
  assert.equal(costs.trueCost, 70.6);
});

test("blank activation remains unknown and explicit discounted zero remains valid", () => {
  const unknownActivation = pricingFromCsv({
    evalCost: "100",
    discountPct: "50",
    discountedEval: "",
    activationFee: "",
  });
  const freeEvaluation = pricingFromCsv({
    evalCost: "100",
    discountPct: "50",
    discountedEval: "0",
    activationFee: "25",
  });

  assert.equal(unknownActivation.trueCost, null);
  assert.equal(freeEvaluation.evalAfterDiscount, 0);
  assert.equal(freeEvaluation.trueCost, 25);
});

test("true_cost is never accepted as a pricing override", () => {
  const pricing = {
    evalCost: 100,
    discountedEval: undefined,
    activationFee: 10,
    discount: { percent: 50 },
    true_cost: 999,
  };

  assert.equal(getCosts({ pricing }).trueCost, 60);
});

test("verified fee refunds remain available as a separate post-refund cost", () => {
  const costs = pricingFromCsv({
    evalCost: "185",
    discountPct: "80",
    discountedEval: "37",
    activationFee: "99",
    feeRefund: true,
  });

  assert.equal(costs.trueCost, 136);
  assert.equal(costs.trueCostAfterRefund, 99);
});
