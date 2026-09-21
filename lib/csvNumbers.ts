export function parseOptionalNumber(value: unknown): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;

  const normalized = raw.replace(/[^0-9.\-]/g, "");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}
