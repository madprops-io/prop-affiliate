const isPositiveNumber = (value?: number | null): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function formatFundingOrAccounts(maxFunding?: number | null, maxAccounts?: number | null) {
  if (isPositiveNumber(maxFunding)) {
    return {
      label: "Max funding",
      value: `$${Math.round(maxFunding).toLocaleString()}`,
      kind: "funding" as const,
    };
  }

  if (isPositiveNumber(maxAccounts)) {
    return {
      label: "Max accounts",
      value: `${Math.round(maxAccounts)}`,
      kind: "accounts" as const,
    };
  }

  return null;
}

export { isPositiveNumber };
