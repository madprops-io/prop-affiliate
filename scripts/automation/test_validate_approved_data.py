import copy
import json
from pathlib import Path
import tempfile
import unittest

from validate_approved_data import ROOT, main, validate

GOOD = {"schemaVersion": 1, "entries": [
    {"key": "firm-a-50k", "approvedAt": "2026-10-31T16:47:26+00:00",
     "promotionExpiresAt": "2026-11-30T23:59:00-05:00",
     "values": {"eval_cost_usd": "200", "discount_code": "SALE", "discount_pct": "30",
                "discounted_eval_usd": "140"}},
    {"key": "firm-b-25k", "approvedAt": "2026-10-31T16:47:26Z",
     "values": {"activation_fee_usd": "0", "ddt": "EOD", "min_days (Eval)": "5"}},
]}


def mutate(fn):
    data = copy.deepcopy(GOOD)
    fn(data)
    return validate(data)[0]


class ValidateApprovedDataTests(unittest.TestCase):
    def test_valid_file_has_no_errors(self):
        self.assertEqual(validate(GOOD), ([], []))

    def test_committed_file_is_valid(self):
        current = json.loads((ROOT / "data/approved-firm-data.json").read_text())
        self.assertEqual(validate(current)[0], [])

    def test_wrong_schema_version(self):
        self.assertTrue(mutate(lambda d: d.update(schemaVersion=2)))

    def test_duplicate_key(self):
        self.assertTrue(any("duplicate" in e for e in mutate(lambda d: d["entries"].append(copy.deepcopy(d["entries"][0])))))

    def test_unpermitted_field(self):
        self.assertTrue(mutate(lambda d: d["entries"][1]["values"].update(affiliate_link="x")))

    def test_non_numeric_price(self):
        self.assertTrue(mutate(lambda d: d["entries"][0]["values"].update(eval_cost_usd="$200")))

    def test_discount_above_100(self):
        self.assertTrue(mutate(lambda d: d["entries"][0]["values"].update(discount_pct="130")))

    def test_discounted_above_regular(self):
        self.assertTrue(mutate(lambda d: d["entries"][0]["values"].update(discounted_eval_usd="250")))

    def test_promotion_without_expiry(self):
        self.assertTrue(mutate(lambda d: d["entries"][0].pop("promotionExpiresAt")))

    def test_naive_timestamps_rejected(self):
        self.assertTrue(mutate(lambda d: d["entries"][1].update(approvedAt="2026-10-31T16:47:26")))

    def test_synthetic_fixture_values_rejected(self):
        self.assertTrue(mutate(lambda d: d["entries"][0]["values"].update(discount_code="TESTCODE")))

    def test_invalid_code(self):
        self.assertTrue(mutate(lambda d: d["entries"][0]["values"].update(discount_code="BAD CODE")))

    def test_change_warnings_do_not_fail(self):
        current = copy.deepcopy(GOOD)
        current["entries"][0]["values"].update(eval_cost_usd="400", discount_code="OTHER")
        errors, warnings = validate(current, GOOD)
        self.assertEqual(errors, [])
        self.assertEqual(len(warnings), 2)

    def test_cli_exit_codes(self):
        with tempfile.TemporaryDirectory() as tmp:
            good, bad = Path(tmp, "good.json"), Path(tmp, "bad.json")
            good.write_text(json.dumps(GOOD))
            bad.write_text("{not json")
            self.assertEqual(main(["--current", str(good), "--base", str(Path(tmp, "missing.json"))]), 0)
            self.assertEqual(main(["--current", str(bad)]), 1)


if __name__ == "__main__":
    unittest.main()
