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

## One-time setup (keyless — recommended)

GitHub signs in to Google with a short-lived token (Workload Identity Federation).
No key file is created or stored, so this works even when your Google organization
blocks service-account keys (`iam.disableServiceAccountKeyCreation`). Only scheduled
or manual runs of this repo's `main` branch can sign in.

1. Open <https://console.cloud.google.com> with your project selected and click the
   **Activate Cloud Shell** icon (`>_`, top right). Paste the block below and press Enter:

   ```bash
   bash <<'EOF'
   REPO="madprops-io/prop-affiliate"
   PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"
   [ -n "$PROJECT_ID" ] || { echo "No project selected: pick your project at the top of the console, then re-run."; exit 1; }
   PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')" || exit 1
   SA="madprops-bot@${PROJECT_ID}.iam.gserviceaccount.com"
   gcloud services enable sheets.googleapis.com iamcredentials.googleapis.com sts.googleapis.com || exit 1
   gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 \
     || gcloud iam service-accounts create madprops-bot --display-name="MadProps bot" || exit 1
   gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 \
     || gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions" || exit 1
   gcloud iam workload-identity-pools providers describe prop-affiliate --location=global \
       --workload-identity-pool=github >/dev/null 2>&1 \
     || gcloud iam workload-identity-pools providers create-oidc prop-affiliate --location=global \
       --workload-identity-pool=github --display-name="prop-affiliate main" \
       --issuer-uri="https://token.actions.githubusercontent.com" \
       --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
       --attribute-condition="assertion.repository=='${REPO}' && assertion.ref=='refs/heads/main'" || exit 1
   gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser \
     --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}" \
     >/dev/null || exit 1
   echo
   echo "=== DONE. Copy these into GitHub (Settings > Secrets and variables > Actions > Variables) ==="
   echo "GCP_WORKLOAD_IDENTITY_PROVIDER = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/prop-affiliate"
   echo "GCP_SERVICE_ACCOUNT            = ${SA}"
   echo "Share your Sheet (Editor) with: ${SA}"
   EOF
   ```

   It is safe to run again; existing pieces are reused. If Cloud Shell asks to authorize, click **Authorize**.
2. In the Sheet, click **Share**, paste the service account email it printed
   (`madprops-bot@...iam.gserviceaccount.com`), choose **Editor**, untick "Notify people", and share.
3. GitHub repo → Settings → Secrets and variables → Actions → **Variables** tab → New repository variable:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`: the `projects/.../providers/prop-affiliate` line it printed.
   - `GCP_SERVICE_ACCOUNT`: the `madprops-bot@...` email it printed.
   - `MADPROPS_SHEET_ID`: the ID from the Sheet's edit URL
     `docs.google.com/spreadsheets/d/<THIS PART>/edit`. This is not the published `/d/e/2PACX...` link.
   - Optional `MADPROPS_SHEET_TAB`: the tab name. Defaults to the first tab.
   No secrets are needed.
4. Make the two workflow edits below, merge the PR, then run the workflow (Actions → Update firm data →
   Run workflow, branch `main`) and read the "Sheet write-back (dry run)" summary.
5. When the dry run looks right, add the variable `SHEET_WRITEBACK` = `write`.
   To turn it off again, delete the variable or change its value.

### Workflow edits (`.github/workflows/update-firms.yml`)

a. Add `id-token: write` to the existing `permissions:` block at the top:

```yaml
permissions:
  contents: write
  pull-requests: write
  id-token: write
```

b. Add these two steps at the very end, after the Resend email step, at the same indentation:

```yaml
      - name: Sign in to Google (keyless)
        if: ${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER != '' }}
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ vars.GCP_SERVICE_ACCOUNT }}
      - name: Write verified updates back to the Google Sheet
        env:
          GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
          MADPROPS_SHEET_ID: ${{ vars.MADPROPS_SHEET_ID }}
          MADPROPS_SHEET_TAB: ${{ vars.MADPROPS_SHEET_TAB }}
          SHEET_WRITEBACK: ${{ vars.SHEET_WRITEBACK }}
        run: python scripts/automation/sheet_writeback.py
```

Until the variables exist, the sign-in step is skipped and the write-back step prints
"Not configured" and passes. The sign-in step writes a temporary `gha-creds-*.json`
file; it runs after every commit step and `.gitignore` excludes it.

### Troubleshooting

- `Permission 'iam.serviceAccounts.getAccessToken' denied` in the sign-in step: the
  binding command in step 1 didn't finish. Re-run the Cloud Shell block.
- `unauthorized_client` / attribute condition: the run was not on `main`. Run it from `main`.
- `Sheets API 403 ... does not have permission`: the Sheet isn't shared with the
  service account as Editor (step 2).
- `Sheets API 404`: `MADPROPS_SHEET_ID` is wrong (use the `/d/<id>/edit` link).

## Alternative: JSON key

If your Google account allows key downloads (personal Google accounts usually do),
you can instead create a key (service account → Keys → Add key → JSON) and save its
full contents as the secret `GOOGLE_SERVICE_ACCOUNT_JSON`. Skip the sign-in step and
the `GCP_*` variables. The key takes priority when both are set.

## Offline preview

```bash
python scripts/automation/sheet_writeback.py --sheet-csv export.csv --write-csv updated.csv
```

## How the site stays consistent

After a write, the Sheet already holds the verified values, so the committed
patch's `expected` guard no longer matches. `verifyFirmUpdates` (lib/firmUpdates.ts)
still treats that patch as verified, and `applyApprovedUpdates` won't let an
older (or expired) approval override fields a current verified patch backs.
