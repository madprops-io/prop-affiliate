const STAR_FILLED = "\u2605";
const STAR_EMPTY = "\u2606";

export function formatStarIcons(score?: number | null): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) return STAR_EMPTY.repeat(5);
  const clamped = Math.min(5, Math.max(0, Math.round(score)));
  return STAR_FILLED.repeat(clamped) + STAR_EMPTY.repeat(5 - clamped);
}
