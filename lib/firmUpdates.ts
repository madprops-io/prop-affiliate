export type CsvRow = Record<string, string>;
export type FirmPatch = {
  key: string;
  expected: CsvRow;
  values: CsvRow;
  verifiedAt: string;
  expiresAt: string;
  source: string;
};
export type UpdateSnapshot = {
  schemaVersion: number;
  generatedAt: string;
  patches: FirmPatch[];
};

const allowed = new Set([
  "eval_cost_usd", "activation_fee_usd", "discount_pct",
  "discounted_eval_usd", "discount_code", "min_days (Eval)", "ddt",
]);

// MadProps affiliate codes; mirrors AFFILIATE_CODES in scripts/automation/collect.py.
// Firms give these codes the same discount as their current public promotion,
// so they are never replaced. Any other Sheet code (or a blank one) may be
// replaced by the firm's verified current public code.
export const AFFILIATE_CODES: readonly string[] = ["MAD", "MADPROPS"];

export function isAffiliateCode(code: string | undefined) {
  return AFFILIATE_CODES.includes((code ?? "").trim().toUpperCase());
}

export function firmRowIdentity(row: CsvRow) {
  return row.firm_key?.startsWith("lucid-") ? row.firm_key : row.key || row.firm_key || "";
}

export function applyFirmUpdates(
  rows: CsvRow[],
  snapshot: UpdateSnapshot,
  now = Date.now(),
) {
  if (snapshot.schemaVersion !== 1) return rows;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = firmRowIdentity(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const patches = new Map<string, FirmPatch[]>();
  for (const patch of snapshot.patches) {
    patches.set(patch.key, [...(patches.get(patch.key) ?? []), patch]);
  }
  return rows.map((row) => {
    const key = firmRowIdentity(row);
    const candidates = patches.get(key);
    if (counts.get(key) !== 1 || candidates?.length !== 1) return row;
    const patch = candidates[0];
    if (!patch || /^(true|yes|1)$/i.test(row.automation_hold?.trim() ?? "")) return row;
    const verified = Date.parse(patch.verifiedAt);
    const expires = Date.parse(patch.expiresAt);
    if (!Number.isFinite(verified) || !Number.isFinite(expires) || verified > now + 60_000 ||
        expires <= now || now - verified > 18 * 60 * 60 * 1000) return row;
    if (Object.entries(patch.expected).some(([field, value]) => (row[field] ?? "") !== value)) return row;
    if (patch.values.discount_code !== undefined && patch.values.discount_code !== row.discount_code &&
        isAffiliateCode(row.discount_code)) return row;
    if (Object.entries(patch.values).some(([field, value]) =>
      !allowed.has(field) || typeof value !== "string" ||
      // An empty discount_code means a verified code-less discount.
      (field === "discount_code" ? !/^(?:[A-Za-z0-9_-]{1,40})?$/.test(value) :
      (field !== "ddt" && !(field === "discounted_eval_usd" && value === "") &&
       (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > (field === "discount_pct" ? 100 : 100_000)))
      )
    )) return row;
    return { ...row, ...patch.values };
  });
}
