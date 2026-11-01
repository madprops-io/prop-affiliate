import csv
import io
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

import sheet_writeback as wb

NOW = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)
HEADER = ["firm_key", "key", "firm_name", "account_label", "eval_cost_usd", "discount_code",
          "discount_pct", "discounted_eval_usd", "automation_hold", "signup_url"]


def sheet(*rows):
    return [list(r) for r in rows]


def row(firm="purdia", key="purdia-eod-50k", cost="$99", code="", pct="0", disc="79", hold=""):
    return [firm, key, firm.title(), "EOD 50K", cost, code, pct, disc, hold, "https://x/?ref=MAD"]


def patch(key="purdia-eod-50k", values=None, expected=None, **extra):
    base = {"key": key,
            "expected": expected if expected is not None else
            {"eval_cost_usd": "99", "discount_code": "", "discount_pct": "0", "discounted_eval_usd": "79"},
            "values": values if values is not None else {"discount_code": "TRY60", "discount_pct": "60",
                                                         "discounted_eval_usd": ""},
            "verifiedAt": "2026-11-01T11:00:00+00:00", "expiresAt": "2026-11-02T05:00:00+00:00"}
    base.update(extra)
    return base


def snap(*patches):
    return {"schemaVersion": 1, "patches": list(patches)}


class PlanTests(unittest.TestCase):
    def test_verified_patch_is_planned_cell_by_cell(self):
        rows = sheet(row())
        updates, report = wb.plan(HEADER, rows, snap(patch()), NOW)
        self.assertEqual(report["applied"], ["purdia-eod-50k"])
        self.assertEqual({(u["row"], u["field"], u["new"]) for u in updates},
                         {(2, "discount_code", "TRY60"), (2, "discount_pct", "60"), (2, "discounted_eval_usd", "")})
        self.assertEqual(rows[0][5:8], ["TRY60", "60", ""])
        self.assertEqual(rows[0][9], "https://x/?ref=MAD", "signup links are never touched")

    def test_formatted_numbers_count_as_equal(self):
        self.assertTrue(wb.same("$1,000", "1000"))
        self.assertTrue(wb.same("60%", "60.0"))
        self.assertFalse(wb.same("79", ""))
        _, report = wb.plan(HEADER, sheet(row(cost="$99.00")), snap(patch(values={"eval_cost_usd": "99"})), NOW)
        self.assertEqual(report["current"], 1)

    def test_row_edited_since_collection_is_a_conflict(self):
        rows = sheet(row(cost="89"))
        updates, report = wb.plan(HEADER, rows, snap(patch()), NOW)
        self.assertEqual(updates, [])
        self.assertEqual(report["conflict"], [{"key": "purdia-eod-50k", "fields": ["eval_cost_usd"]}])
        self.assertEqual(rows[0][4], "89")

    def test_affiliate_codes_are_never_written(self):
        for firm, code in (("bulenox", "MAD"), ("lucidtrading", "MAD"), ("tradeify", "MADPROPS"), ("phidias", "")):
            rows = sheet(row(firm=firm, key=f"{firm}-50k", code=code))
            p = patch(key=f"{firm}-50k", expected={"discount_code": code},
                      values={"discount_code": "OTHER", "eval_cost_usd": "120"})
            updates, report = wb.plan(HEADER, rows, snap(p), NOW)
            self.assertEqual([u["field"] for u in updates], ["eval_cost_usd"], firm)
            self.assertEqual(rows[0][5], code, firm)
            self.assertEqual(report["affiliate_code_kept"], 1, firm)

    def test_expired_held_missing_and_duplicate_rows_are_skipped(self):
        _, r = wb.plan(HEADER, sheet(row()), snap(patch(expiresAt="2026-11-01T11:59:00+00:00")), NOW)
        self.assertEqual(r["expired"], ["purdia-eod-50k"])
        _, r = wb.plan(HEADER, sheet(row()), snap(patch(promotionExpiresAt="2026-11-01T00:00:00Z")), NOW)
        self.assertEqual(r["expired"], ["purdia-eod-50k"])
        _, r = wb.plan(HEADER, sheet(row(hold="yes")), snap(patch()), NOW)
        self.assertEqual(r["held"], ["purdia-eod-50k"])
        _, r = wb.plan(HEADER, sheet(row()), snap(patch(key="nope")), NOW)
        self.assertEqual(r["missing"], ["nope"])
        updates, r = wb.plan(HEADER, sheet(row(), row()), snap(patch()), NOW)
        self.assertEqual((updates, r["missing"]), ([], ["purdia-eod-50k"]))

    def test_lucid_rows_match_in_old_and_corrected_layouts(self):
        for firm, key in (("lucid-pro-25k", "lucid-pro-25k"), ("lucidtrading", "lucid-pro-25k")):
            rows = sheet(row(firm=firm, key=key, code="MAD"))
            p = patch(key="lucid-pro-25k", expected={"discount_code": "MAD"}, values={"eval_cost_usd": "110"})
            updates, _ = wb.plan(HEADER, rows, snap(p), NOW)
            self.assertEqual([(u["row"], u["new"]) for u in updates], [(2, "110")], firm)

    def test_large_change_guard_trips_above_half_the_sheet(self):
        rows = sheet(row(key="a"), row(key="b"), row(key="c"))
        _, r = wb.plan(HEADER, rows, snap(patch(key="a"), patch(key="b")), NOW)
        self.assertTrue(r["too_many"])
        _, r = wb.plan(HEADER, sheet(row(key="a"), row(key="b"), row(key="c")), snap(patch(key="a")), NOW)
        self.assertFalse(r["too_many"])

    def test_unexpected_header_is_refused(self):
        with self.assertRaises(ValueError):
            wb.plan(["firm_key", "key", "price"], [], snap(), NOW)

    def test_column_letters(self):
        self.assertEqual([wb.column_letter(i) for i in (0, 25, 26, 27, 701, 702)],
                         ["A", "Z", "AA", "AB", "ZZ", "AAA"])


class MainTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.updates = self.tmp / "updates.json"
        self.updates.write_text(json.dumps(snap(patch())))

    def test_offline_mode_writes_updated_copy(self):
        src, out = self.tmp / "sheet.csv", self.tmp / "out.csv"
        with open(src, "w", newline="") as fh:
            csv.writer(fh).writerows([HEADER, row(), row(key="b"), row(key="c")])
        with mock.patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": ""}), mock.patch("builtins.print"):
            code = wb.main(["--updates", str(self.updates), "--sheet-csv", str(src),
                            "--write-csv", str(out), "--now", NOW.isoformat()])
        self.assertEqual(code, 0)
        written = list(csv.reader(io.StringIO(out.read_text())))
        self.assertEqual(written[1][5:8], ["TRY60", "60", ""])

    def test_unconfigured_live_run_writes_nothing_and_succeeds(self):
        env = {"GOOGLE_SERVICE_ACCOUNT_JSON": "", "MADPROPS_SHEET_ID": "", "GITHUB_STEP_SUMMARY": ""}
        with mock.patch.dict(os.environ, env), mock.patch.object(wb, "SheetClient") as client, \
                mock.patch("builtins.print"):
            self.assertEqual(wb.main(["--updates", str(self.updates)]), 0)
        client.assert_not_called()

    def test_dry_run_reads_but_never_writes(self):
        fake = mock.Mock()
        fake.read.return_value = (HEADER, sheet(row(), row(key="b"), row(key="c")))
        env = {"GOOGLE_SERVICE_ACCOUNT_JSON": "{}", "MADPROPS_SHEET_ID": "id", "SHEET_WRITEBACK": "",
               "GITHUB_STEP_SUMMARY": ""}
        with mock.patch.dict(os.environ, env), mock.patch.object(wb, "SheetClient", return_value=fake), \
                mock.patch("builtins.print"):
            self.assertEqual(wb.main(["--updates", str(self.updates), "--now", NOW.isoformat()]), 0)
        fake.write.assert_not_called()

    def test_write_mode_sends_planned_cells(self):
        fake = mock.Mock()
        fake.read.return_value = (HEADER, sheet(row(), row(key="b"), row(key="c")))
        env = {"GOOGLE_SERVICE_ACCOUNT_JSON": "{}", "MADPROPS_SHEET_ID": "id", "SHEET_WRITEBACK": "write",
               "GITHUB_STEP_SUMMARY": ""}
        with mock.patch.dict(os.environ, env), mock.patch.object(wb, "SheetClient", return_value=fake), \
                mock.patch("builtins.print"):
            self.assertEqual(wb.main(["--updates", str(self.updates), "--now", NOW.isoformat()]), 0)
        sent = fake.write.call_args.args[0]
        self.assertTrue(all(u["row"] == 2 for u in sent))
        self.assertEqual({u["field"] for u in sent}, {"discount_code", "discount_pct", "discounted_eval_usd"})


    def test_write_mode_writes_nothing_when_guard_trips(self):
        fake = mock.Mock()
        fake.read.return_value = (HEADER, sheet(row()))
        env = {"GOOGLE_SERVICE_ACCOUNT_JSON": "{}", "MADPROPS_SHEET_ID": "id", "SHEET_WRITEBACK": "write",
               "GITHUB_STEP_SUMMARY": ""}
        with mock.patch.dict(os.environ, env), mock.patch.object(wb, "SheetClient", return_value=fake), \
                mock.patch("builtins.print"):
            self.assertEqual(wb.main(["--updates", str(self.updates), "--now", NOW.isoformat()]), 1)
        fake.write.assert_not_called()


class ClientTests(unittest.TestCase):
    def test_text_fields_raw_numbers_user_entered(self):
        client = wb.SheetClient.__new__(wb.SheetClient)
        client.base, client.tab = "https://api/x", "Firm's data"
        client._call = mock.Mock()
        client.write([{"row": 5, "col": 5, "field": "discount_code", "new": "0050"},
                      {"row": 5, "col": 4, "field": "eval_cost_usd", "new": "120"}])
        (_, _, raw), (_, _, entered) = [(c.args[0], c.args[1], c.kwargs["json"]) for c in client._call.call_args_list]
        self.assertEqual(raw, {"valueInputOption": "RAW",
                               "data": [{"range": "'Firm''s data'!F5", "values": [["0050"]]}]})
        self.assertEqual(entered["valueInputOption"], "USER_ENTERED")
        self.assertEqual(entered["data"][0]["range"], "'Firm''s data'!E5")


if __name__ == "__main__":
    unittest.main()
