"""Write verified collector patches back into the MadProps Google Sheet.

Safety rules (each patch is all-or-nothing):
- Only cells in WRITABLE are ever written; rows are never added or deleted.
- A patch is applied only if the Sheet row still holds every value the collector
  read ("expected"). If someone edited the row since, it is skipped as a conflict.
- discount_code is never written on affiliate firms (MAD/MADPROPS stay put).
- Expired patches and promotions are skipped, and so are rows with automation_hold.
- If more than MAX_ROW_SHARE of the Sheet would change in one run, nothing is written.

Modes:
- Live (GitHub Actions): GOOGLE_SERVICE_ACCOUNT_JSON secret + MADPROPS_SHEET_ID
  variable. Writes only when SHEET_WRITEBACK=write, otherwise reports a dry run.
- Offline: --sheet-csv export.csv --write-csv updated.csv produces a paste-ready copy.
"""
import argparse
import csv
import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from collect import AFFILIATE_CODES, AFFILIATE_FIRMS, ROOT, row_firm, row_identity

WRITABLE = {"eval_cost_usd", "activation_fee_usd", "discount_code", "discount_pct",
            "discounted_eval_usd", "min_days (Eval)", "ddt"}
TEXT_FIELDS = {"discount_code", "ddt"}  # written RAW so Sheets never reinterprets them
MAX_ROW_SHARE = 0.5
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
API = "https://sheets.googleapis.com/v4/spreadsheets"


def norm(value):
    text = str(value if value is not None else "").strip()
    bare = text.replace("$", "").replace(",", "").replace("%", "")
    try:
        number = float(bare)
    except ValueError:
        return text
    return repr(round(number, 6))


def same(a, b):
    return norm(a) == norm(b)


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


def column_letter(index):
    letters = ""
    index += 1
    while index:
        index, rem = divmod(index - 1, 26)
        letters = chr(65 + rem) + letters
    return letters


def plan(header, rows, snapshot, now):
    """Return (cell updates, report). rows exclude the header; Sheet row n+2."""
    columns = {name.strip(): i for i, name in enumerate(header)}
    missing = WRITABLE - columns.keys() - {"min_days (Eval)", "ddt", "activation_fee_usd"}
    if missing or "key" not in columns or "firm_key" not in columns:
        raise ValueError(f"Unexpected Sheet header; missing {sorted(missing) or 'key/firm_key'}")

    def record(cells):
        return {name: (cells[i] if i < len(cells) else "") for name, i in columns.items()}

    records = [record(cells) for cells in rows]
    index, dupes = {}, set()
    for n, rec in enumerate(records):
        ident = row_identity(rec)
        if ident:
            if ident in index:
                dupes.add(ident)
            index[ident] = n

    updates, report = [], {"applied": [], "current": 0, "conflict": [], "missing": [],
                           "expired": [], "held": [], "affiliate_code_kept": 0}
    for patch in snapshot.get("patches", []):
        key = patch.get("key", "")
        if key in dupes or key not in index:
            report["missing"].append(key)
            continue
        expires = parse_time(patch.get("expiresAt"))
        promo = parse_time(patch.get("promotionExpiresAt"))
        if (expires and expires <= now) or (promo and promo <= now):
            report["expired"].append(key)
            continue
        n = index[key]
        rec = records[n]
        if rec.get("automation_hold", "").strip().lower() in ("yes", "true", "1"):
            report["held"].append(key)
            continue
        affiliate = row_firm(rec) in AFFILIATE_FIRMS
        values = {}
        for field, value in patch.get("values", {}).items():
            if field not in WRITABLE or field not in columns:
                continue
            if field == "discount_code" and (affiliate or rec.get("discount_code", "").strip().upper() in AFFILIATE_CODES):
                report["affiliate_code_kept"] += 1
                continue
            values[field] = value
        changed = {f: v for f, v in values.items() if not same(rec.get(f, ""), v)}
        if not changed:
            report["current"] += 1
            continue
        stale = [f for f, v in patch.get("expected", {}).items()
                 if f in columns and not same(rec.get(f, ""), v)]
        if stale:
            report["conflict"].append({"key": key, "fields": stale})
            continue
        for field, value in changed.items():
            updates.append({"row": n + 2, "col": columns[field], "field": field,
                            "old": rec.get(field, ""), "new": value, "key": key})
            rows[n] = list(rows[n]) + [""] * (columns[field] + 1 - len(rows[n]))
            rows[n][columns[field]] = value
        report["applied"].append(key)
    report["rows_changed"] = len(report["applied"])
    report["rows_total"] = len(records)
    report["too_many"] = bool(records) and report["rows_changed"] > MAX_ROW_SHARE * len(records)
    return updates, report


def summary(report, updates, mode):
    lines = [f"## Sheet write-back ({mode})", "",
             f"- Rows updated: **{report['rows_changed']}** ({len(updates)} cells)",
             f"- Already up to date: {report['current']}",
             f"- Affiliate codes left untouched: {report['affiliate_code_kept']}",
             f"- Skipped, row edited since the bot read it: {len(report['conflict'])}",
             f"- Skipped, row not found / duplicate key: {len(report['missing'])}",
             f"- Skipped, expired: {len(report['expired'])}",
             f"- Skipped, automation_hold set: {len(report['held'])}"]
    if report["too_many"]:
        lines += ["", f"**Stopped:** {report['rows_changed']} of {report['rows_total']} rows would change "
                  f"(limit {int(MAX_ROW_SHARE * 100)}%). Nothing was written."]
    if updates:
        lines += ["", "| Row | Key | Field | Old | New |", "|---|---|---|---|---|"]
        lines += [f"| {u['row']} | {u['key']} | {u['field']} | {u['old'] or '(blank)'} | {u['new'] or '(blank)'} |"
                  for u in updates]
    for item in report["conflict"]:
        lines.append(f"- Conflict `{item['key']}`: Sheet changed in {', '.join(item['fields'])}")
    for key in report["missing"]:
        lines.append(f"- Not found `{key}`")
    return "\n".join(lines) + "\n"


class SheetClient:
    def __init__(self, credentials_json, sheet_id, tab=""):
        from google.auth.transport.requests import AuthorizedSession
        from google.oauth2.service_account import Credentials
        creds = Credentials.from_service_account_info(json.loads(credentials_json), scopes=SCOPES)
        self.session = AuthorizedSession(creds)
        self.base = f"{API}/{sheet_id}"
        self.tab = tab or self._first_tab()

    def _call(self, method, url, **kwargs):
        response = self.session.request(method, url, timeout=60, **kwargs)
        if response.status_code >= 400:
            raise RuntimeError(f"Sheets API {response.status_code}: {response.text[:300]}")
        return response.json()

    def _first_tab(self):
        meta = self._call("GET", self.base, params={"fields": "sheets.properties"})
        first = min(meta["sheets"], key=lambda s: s["properties"]["index"])
        return first["properties"]["title"]

    def _range(self, a1):
        return "'" + self.tab.replace("'", "''") + "'!" + a1

    def read(self):
        data = self._call("GET", f"{self.base}/values/{self._range('A1:ZZ')}",
                          params={"valueRenderOption": "FORMATTED_VALUE"})
        values = data.get("values", [])
        return values[0], [list(r) for r in values[1:]]

    def write(self, updates):
        for text, option in ((True, "RAW"), (False, "USER_ENTERED")):
            batch = [{"range": self._range(f"{column_letter(u['col'])}{u['row']}"), "values": [[u["new"]]]}
                     for u in updates if (u["field"] in TEXT_FIELDS) == text]
            if batch:
                self._call("POST", f"{self.base}/values:batchUpdate",
                           json={"valueInputOption": option, "data": batch})


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--updates", type=Path, default=ROOT / "data/firm-updates.json")
    parser.add_argument("--sheet-csv", type=Path, help="Offline: use this Sheet export instead of the API")
    parser.add_argument("--write-csv", type=Path, help="Offline: write the updated Sheet copy here")
    parser.add_argument("--now", help="ISO time override (tests)")
    args = parser.parse_args(argv)
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    snapshot = json.loads(args.updates.read_text())
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")

    def emit(text):
        print(text)
        if step_summary:
            with open(step_summary, "a") as fh:
                fh.write(text)

    if args.sheet_csv:
        all_rows = list(csv.reader(io.StringIO(args.sheet_csv.read_text(encoding="utf-8-sig"))))
        header, rows = all_rows[0], all_rows[1:]
        updates, report = plan(header, rows, snapshot, now)
        emit(summary(report, updates, "offline"))
        if args.write_csv and not report["too_many"]:
            with open(args.write_csv, "w", newline="", encoding="utf-8") as fh:
                csv.writer(fh).writerows([header] + rows)
        return 0

    credentials = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    sheet_id = os.environ.get("MADPROPS_SHEET_ID", "").strip()
    if not credentials or not sheet_id:
        emit("## Sheet write-back\n\nNot configured (needs GOOGLE_SERVICE_ACCOUNT_JSON secret and "
             "MADPROPS_SHEET_ID variable). Nothing written.\n")
        return 0
    write = os.environ.get("SHEET_WRITEBACK", "").strip().lower() == "write"
    client = SheetClient(credentials, sheet_id, os.environ.get("MADPROPS_SHEET_TAB", "").strip())
    header, rows = client.read()
    updates, report = plan(header, rows, snapshot, now)
    mode = "live write" if write and not report["too_many"] else "dry run"
    if write and updates and not report["too_many"]:
        client.write(updates)
    emit(summary(report, updates, mode))
    return 1 if report["too_many"] and write else 0


if __name__ == "__main__":
    sys.exit(main())
