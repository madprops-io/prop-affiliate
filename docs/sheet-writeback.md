# Sheet write-back

`scripts/automation/sheet_writeback.py` copies the bot's **verified** changes
(`data/firm-updates.json`) into the Google Sheet, so the Sheet stays current
without hand edits. It runs as the last step of the "Update firm data" workflow.

## What it will and won't touch

| Rule | Behaviour |
|---|---|
| Columns | Only `eval_cost_usd`, `activation_fee_usd`, `discount_code`, `discount_pct`, `discounted_eval_usd`, `min_days (Eval)`, `ddt` |
| Rows | Never adds, deletes or reorders rows |
| Affiliate codes | Never writes `discount_code` on affiliate firms or rows holding MAD / MADPROPS |
| Your edits win | If a row changed since the bot read it, that row is skipped ("conflict") |
| `automation_hold` | Rows with `yes` / `true` / `1` are skipped |
| Expired | Expired patches and ended promotions are skipped |
| Safety stop | If more than half the Sheet would change in one run, nothing is written |
| Dry run | Writes only when the repo variable `SHEET_WRITEBACK` is `write` |

Each run posts a table (row, key, field, old → new) in the workflow run summary.

Note: a promotion the bot writes stays in the Sheet until the bot verifies a
change. If a firm's site later becomes unreachable, update those rows by hand.

## One-time setup

1. Go to <https://console.cloud.google.com> and create a project, for example "madprops-bot".
2. APIs & Services → Library → enable **Google Sheets API**.
3. IAM & Admin → Service Accounts → **Create service account**. No roles are needed.
4. Open the account → **Keys** → Add key → JSON. A `.json` file downloads.
5. In the Sheet, click **Share**, paste the service account email
   (`...@...iam.gserviceaccount.com`) and give it **Editor** access.
6. GitHub repo → Settings → Secrets and variables → Actions:
   - **Secret** `GOOGLE_SERVICE_ACCOUNT_JSON`: paste the full contents of the JSON file.
   - **Variable** `MADPROPS_SHEET_ID`: the ID from the Sheet's edit URL
     `docs.google.com/spreadsheets/d/<THIS PART>/edit`. This is not the published `/d/e/2PACX...` link.
   - Optional variable `MADPROPS_SHEET_TAB`: the tab name. Defaults to the first tab.
7. Add the workflow step below, then run the workflow (Actions → Update firm data →
   Run workflow) and read the "Sheet write-back (dry run)" summary.
8. When the dry run looks right, add the variable `SHEET_WRITEBACK` = `write`.
   To turn it off again, delete the variable or change its value.

If step 4 says key creation is disabled, your Google organization blocks
service-account keys (`iam.disableServiceAccountKeyCreation`). Use a personal
Google account project, or have the policy lifted for this project.

## Workflow step

Add this at the end of `.github/workflows/update-firms.yml`, after the Resend email step:

```yaml
      - name: Write verified updates back to the Google Sheet
        env:
          GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
          MADPROPS_SHEET_ID: ${{ vars.MADPROPS_SHEET_ID }}
          MADPROPS_SHEET_TAB: ${{ vars.MADPROPS_SHEET_TAB }}
          SHEET_WRITEBACK: ${{ vars.SHEET_WRITEBACK }}
        run: python scripts/automation/sheet_writeback.py
```

Until the secret and variable exist, the step prints "Not configured" and passes.

## Offline preview

```bash
python scripts/automation/sheet_writeback.py --sheet-csv export.csv --write-csv updated.csv
```

## How the site stays consistent

After a write, the Sheet already holds the verified values, so the committed
patch's `expected` guard no longer matches. `verifyFirmUpdates` (lib/firmUpdates.ts)
still treats that patch as verified, and `applyApprovedUpdates` won't let an
older (or expired) approval override fields a current verified patch backs.
