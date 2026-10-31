import Papa from "papaparse";
import snapshot from "@/data/firm-updates.json";
import approved from "@/data/approved-firm-data.json";
import { applyApprovedUpdates, type ApprovedSnapshot } from "./approvedUpdates";
import { applyFirmUpdates, approvedTradeifyCodes, type CsvRow, type UpdateSnapshot } from "./firmUpdates";
import { publicFirmUpdateStatus } from "./firmUpdateStatus";

export async function loadFirmCsv(nocache = false) {
  const url = process.env.NEXT_PUBLIC_SHEET_CSV_URL || process.env.SHEET_CSV_URL;
  if (!url) throw new Error("Missing Sheet CSV URL");
  const response = await fetch(url, nocache
    ? { cache: "no-store", signal: AbortSignal.timeout(20_000) }
    : { next: { revalidate: 600 }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Sheet fetch failed (${response.status})`);
  const text = await response.text();
  const parsed = Papa.parse<CsvRow>(text, {
    header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length || !parsed.meta.fields?.includes("firm_key")) {
    throw new Error("Invalid Sheet CSV; updates were not applied");
  }
  const rows = process.env.MADPROPS_AUTOMATION_DISABLED === "1"
    ? parsed.data : applyApprovedUpdates(parsed.data, applyFirmUpdates(parsed.data, snapshot as unknown as UpdateSnapshot, Date.now(), approvedTradeifyCodes(approved)), approved as ApprovedSnapshot);
  return Papa.unparse(rows, { columns: parsed.meta.fields });
}

/** Public monitoring status. Unverified `review[].proposed` prices are stripped. */
export function firmUpdateStatus() {
  return publicFirmUpdateStatus(snapshot, process.env.MADPROPS_AUTOMATION_DISABLED === "1");
}
