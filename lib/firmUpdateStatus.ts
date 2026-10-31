/**
 * Public view of the collector snapshot served by /api/firm-data?status=1.
 *
 * `review[].proposed` holds prices the collector could NOT verify (e.g. the
 * coupon for the existing Sheet code was not confirmed). They must never be
 * published, so they are stripped here. Everything else (patches, coverage,
 * diagnostics, stale/disabled flags) stays visible for monitoring.
 */
type StatusSnapshot = { generatedAt: string; review?: unknown } & Record<string, unknown>;

const STALE_AFTER_MS = 18 * 60 * 60 * 1000;

export function stripUnverifiedProposals(review: unknown): unknown {
  if (!Array.isArray(review)) return review;
  return review.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { proposed, ...rest } = item as Record<string, unknown>;
    return rest;
  });
}

export function publicFirmUpdateStatus<T extends StatusSnapshot>(
  snapshot: T,
  disabled: boolean,
  now = Date.now(),
) {
  return {
    ...snapshot,
    ...("review" in snapshot ? { review: stripUnverifiedProposals(snapshot.review) } : {}),
    disabled,
    stale: !(now - Date.parse(snapshot.generatedAt) <= STALE_AFTER_MS),
  };
}
