export const MODEL_TAGS = ["Instant", "Eval"] as const;
export type ModelTag = (typeof MODEL_TAGS)[number];

const MODEL_SPLIT_REGEX = /[|,/;&]+/;

export function splitModelValue(value?: string | null) {
  if (!value) return [] as string[];
  return value
    .split(MODEL_SPLIT_REGEX)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeModelTag(value?: string | null): ModelTag | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("instant")) return "Instant";
  return "Eval";
}

export function normalizeModelList(
  values?: string | string[] | Array<string | null | undefined> | null
): ModelTag[] {
  const tokens = Array.isArray(values)
    ? values
    : typeof values === "string"
    ? splitModelValue(values)
    : [];
  const seen = new Set<ModelTag>();
  tokens.forEach((token) => {
    const normalized = normalizeModelTag(token);
    if (normalized) seen.add(normalized);
  });
  return Array.from(seen);
}

export function normalizeModelField(
  value?: string | string[] | Array<string | null | undefined> | null
): ModelTag | ModelTag[] | undefined {
  const normalized = normalizeModelList(value);
  if (normalized.length === 0) return undefined;
  if (normalized.length === 1) return normalized[0];
  return normalized;
}
