# Approval workflow (draft)

Every six hours the collector still publishes fresh verified patches immediately. The
workflow also generates a pull request containing changes to
`data/approved-firm-data.json`. **Merge the pull request to approve** the proposed
values as a durable baseline. No one-click public email approval link or separate
email provider is configured: enable GitHub email notifications for pull requests
on this repository.

The approved baseline is applied when a live verified patch is not changing that
field. It never overwrites a current verified value. Approval does not change the
published Google Sheet, and the Sheet remains the original reference.

Promotions have a separate `promotionExpiresAt` taken from the official source,
distinct from the 18-hour patch freshness. After expiration, the approved promo
fields are cleared rather than falling back to a stale Sheet coupon. Base price
and fees can remain approved indefinitely.

Review limitations before merging:
- `GITHUB_TOKEN` must have permission to create pull requests. Repository Actions
  settings may need **Allow GitHub Actions to create and approve pull requests**.
- GitHub notification emails depend on your account's notification settings.
- New proposals are based on collector's verified patch values, not independent
  human verification. Always review source links and changed fields.
- `automation_hold=yes` in the Sheet disables both live and approved overrides
  for that plan.
- This change does not expand collector coverage beyond the existing adapters.
- The approval mechanism needs CI tests and a Vercel preview before production.
