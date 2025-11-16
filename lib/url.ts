export type SortKey = "score" | "payout" | "activation" | "discount";
export const SORT_KEYS: SortKey[] = ["score", "payout", "activation", "discount"];

export const getNum = (sp: URLSearchParams, key: string, def: number | null = null) => {
  const v = sp.get(key);
  if (v == null || v.trim() === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const getSort = (sp: URLSearchParams, key: string, def: SortKey): SortKey => {
  const v = (sp.get(key) || "").toLowerCase();
  return (SORT_KEYS as readonly string[]).includes(v) ? (v as SortKey) : def;
};
