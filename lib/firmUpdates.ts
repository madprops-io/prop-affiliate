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

// Generic public sale codes (not MadProps affiliate identifiers). Mirrors
// PUBLIC_SALE_CODES in scripts/automation/collect.py. Unknown/custom codes are
// never replaced, because they may be affiliate-specific.
export const PUBLIC_SALE_CODES: Readonly<Record<string, readonly string[]>> = {
  apex: ["SAVENOW"],
  tradeify: ["SEP", "GEMS"],
};

type ApprovedCodeSource = { entries?: Array<{ key?: unknown; values?: Record<string, unknown> }> };

/**
 * Previously human-approved official Tradeify codes may also roll to a new code.
 * Mirrors prior_approved_tradeify_codes() in scripts/automation/collect.py.
 */
export function approvedTradeifyCodes(approved: ApprovedCodeSource | null | undefined): string[] {
  const codes = new Set<string>();
  for (const entry of Array.isArray(approved?.entries) ? approved.entries : []) {
    const code = entry?.values?.discount_code;
    if (typeof entry?.key === "string" && entry.key.startsWith("tradeify-") &&
        typeof code === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(code)) {
      codes.add(code.toUpperCase());
    }
  }
  return [...codes];
}

export function rotatableSaleCodes(firmKey: string | undefined, approvedTradeify: readonly string[] = []) {
  const base = PUBLIC_SALE_CODES[firmKey ?? ""] ?? [];
  return firmKey === "tradeify" ? [...base, ...approvedTradeify.map((c) => c.toUpperCase())] : [...base];
}

export function firmRowIdentity(row: CsvRow) {
  return row.firm_key?.startsWith("lucid-") ? row.firm_key : row.key || row.firm_key || "";
}

export function applyFirmUpdates(
  rows: CsvRow[],
  snapshot: UpdateSnapshot,
  now = Date.now(),
  approvedTradeify: readonly string[] = [],
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
    if (patch.values.discount_code !== undefined && patch.values.discount_code !== row.discount_code) {
      const replaceable = rotatableSaleCodes(row.firm_key, approvedTradeify);
      if (!replaceable.includes(row.discount_code?.toUpperCase() ?? "")) return row;
    }
    if (Object.entries(patch.values).some(([field, value]) =>
      !allowed.has(field) || typeof value !== "string" ||
      (field === "discount_code" ? !/^[A-Za-z0-9_-]{1,40}$/.test(value) :
      (field !== "ddt" && !(field === "discounted_eval_usd" && value === "") &&
       (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > (field === "discount_pct" ? 100 : 100_000)))
      )
    )) return row;
    return { ...row, ...patch.values };
  });
}
