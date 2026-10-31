import type { CsvRow } from "./firmUpdates";

/**
 * Human-approved values are durable. Time-limited promotions are NOT:
 * once expired, discount fields are cleared rather than restored from an old Sheet.
 * A current verified collector patch always takes precedence.
 */
export type ApprovedEntry = {
  key: string;
  values: Record<string, string>;
  approvedAt: string;
  promotionExpiresAt?: string;
};
export type ApprovedSnapshot = { schemaVersion: 1; entries: ApprovedEntry[] };

const permitted = new Set([
  "eval_cost_usd", "activation_fee_usd", "discount_code",
  "discount_pct", "discounted_eval_usd", "min_days (Eval)", "ddt",
]);
const promotionFields = new Set(["discount_code", "discount_pct", "discounted_eval_usd"]);
const identity = (row: CsvRow) => row.firm_key?.startsWith("lucid-")
  ? row.firm_key : row.key || row.firm_key || "";

export function applyApprovedUpdates(
  sheetRows: CsvRow[],
  verifiedRows: CsvRow[],
  approved: ApprovedSnapshot,
  now = Date.now(),
): CsvRow[] {
  if (approved.schemaVersion !== 1 || sheetRows.length !== verifiedRows.length) return verifiedRows;
  const entries = new Map<string, ApprovedEntry>();
  const duplicates = new Set<string>();
  for (const entry of approved.entries) {
    if (entries.has(entry.key)) duplicates.add(entry.key);
    entries.set(entry.key, entry);
  }
  const counts = new Map<string, number>();
  for (const row of sheetRows) counts.set(identity(row), (counts.get(identity(row)) ?? 0) + 1);

  return verifiedRows.map((verified, index) => {
    const sheet = sheetRows[index];
    const key = identity(sheet);
    const entry = entries.get(key);
    if (!entry || duplicates.has(key) || counts.get(key) !== 1 ||
        !Number.isFinite(Date.parse(entry.approvedAt)) ||
        /^(yes|true|1)$/i.test(sheet.automation_hold?.trim() ?? "")) return verified;
    const expires = entry.promotionExpiresAt ? Date.parse(entry.promotionExpiresAt) : NaN;
    const expired = Number.isFinite(expires) && now >= expires;
    const output = { ...verified };
    for (const [field, value] of Object.entries(entry.values)) {
      if (!permitted.has(field) || typeof value !== "string") continue;
      // Fresh verified patches take priority over an older approval.
      if ((verified[field] ?? "") !== (sheet[field] ?? "")) continue;
      if (promotionFields.has(field)) {
        if (!entry.promotionExpiresAt || !Number.isFinite(expires)) continue;
        output[field] = expired
          ? (field === "discount_pct" ? "0" : "")
          : value;
      } else {
        output[field] = value;
      }
    }
    // Expired approved promotions must not resurrect the old Sheet discount.
    if (expired && [...promotionFields].some((field) => field in entry.values)) {
      for (const field of promotionFields) {
        if ((verified[field] ?? "") === (sheet[field] ?? "")) {
          output[field] = field === "discount_pct" ? "0" : "";
        }
      }
    }
    return output;
  });
}
