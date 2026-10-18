# Automatic MadProps updates

The first working collectors read product data from Apex, Tradeify, DayTraders,
and Lucid. This is partial coverage, not a claim that all firms or all rules have
been automated. The generated report lists every firm still awaiting an adapter.

## Data path

1. GitHub Actions runs `scripts/automation/collect.py` every six hours.
2. The collector downloads the current public Sheet and official product pages.
   It parses embedded product data without running the pages' JavaScript.
3. It matches existing plans, checks platform agreement and coupon applicability,
   then writes guarded patches to `data/firm-updates.json`.
4. Actions commits that file to main. The connected Vercel project must deploy
   that commit. No Google Sheet write credentials or paid scraping/AI service is
   required for these adapters.
5. `/api/firm-data` fetches the Sheet, applies fresh matching patches, and returns
   CSV to the existing site. `/api/firms` uses the same merged data.

The Google Sheet is not modified. It remains the baseline for all other cells.
Patches expire after at most 18 hours, or at the verified sale's expiration,
whichever comes first. A failed run cannot keep an automatic price alive forever.
Expired/unmatched patches revert to the Sheet, whose values may themselves be
outdated. Freshness must therefore be checked; fallback is not verification.

## Activation

1. Merge this change into `main` to enable the workflow on the default branch.
2. An initial collection runs automatically when the collector/workflow change
   reaches main. To repeat it, open GitHub **Actions → Update firm data → Run
   workflow → main**. Scheduled runs begin after merge. GitHub may
   delay scheduled runs and disables schedules in inactive public repositories.
3. If the publish step reports a permissions failure, repository **Settings →
   Actions → General → Workflow permissions** must allow read/write contents.
   Branch protection requiring pull requests may require adapting publishing to
   pull requests instead of direct pushes. Do not bypass repository protection.
4. Confirm the resulting commit deploys in Vercel. If Vercel rejects the bot
   author, approve/configure that deployment using the project owner's account.
5. Check `/api/firm-data?status=1`: `generatedAt` should be recent, `stale` false,
   and `disabled` false. Check the workflow Summary for changed cells, review
   items and firms without adapters. A successful build alone does not establish
   that recurring collection and deployment work.

## Exactly what is automated

- **Apex:** single-account, visible evaluation products; account size, drawdown
  plan and activation variant must match; visible platforms must agree on price.
  Base price and verified public sale percentage update together. Free activation
  becomes a literal zero only when `free_activation` is explicitly true. A PA
  product price is not assumed to be an activation fee when `activation_fee` is
  null.
- **Tradeify:** Growth, Select, Lightning prices; visible brokers must agree.
  Uses current JS coupon configuration and that year's advertised expiration;
  replicates the storefront's whole-dollar rounding with an exact discounted
  override only when necessary. Explicit “None” activation is verified zero.
  Does not select optional consistency add-ons.
- **DayTraders:** mapped group and account size; single-account base price,
  explicit activation fee and explicitly stated qualifying evaluation days.
  Does not guess fees missing from source data or apply volume pricing.
- **Lucid:** reads ordinary Pro/Flex/Direct product data and supported drawdown
  text. Anonymous storefront discounts are not treated as proof of eligibility
  for an affiliate code. Pricing is held for review until that connection is
  verified. Daily plans with selectable price variants require explicit mapping.

Only generic public sale codes **SAVENOW** (Apex) and **SEP/GEMS** (Tradeify) are
eligible to rotate to the source's current public code. Custom affiliate codes
such as MAD are never replaced. The public-code policy is enforced in both the
collector and server merger. Affiliate/signup URLs are never writable patches.
`true_cost` is never written. Blank/unknown activation stays unknown.

## Manual control and rollback

- Add `automation_hold` to the Sheet and put `yes` on a plan to disable its
  automatic patches. A manual edit to a guarded cell invalidates the current
  patch; a later collector run may verify the source again unless held.
- Set `MADPROPS_AUTOMATION_DISABLED=1` in Vercel and redeploy to return to
  Sheet-only data globally. Disable **Update firm data** in Actions to stop runs.
- Revert the integration commit if a full code rollback is necessary.

## Development and checks

```bash
python -m pip install -r scripts/automation/requirements.txt
python -m unittest discover -s scripts/automation -p 'test_*.py'
python scripts/automation/collect.py
npm test
npm run typecheck
npm run build
```

An optional `SHEET_CSV_URL` environment variable changes the collector's baseline
feed; the website keeps using its existing `NEXT_PUBLIC_SHEET_CSV_URL` or
`SHEET_CSV_URL`. Keep those pointed at the same Sheet.

Adding more firms means implementing and testing a source-specific adapter.
Unsupported firms keep their existing Sheet values and are listed in the report;
they are not automatically monitored for rule changes by this release.
