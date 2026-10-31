import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo

import collect
from collect import apex, blue_guardian, build, daytraders, literal, lucid, money, tradeify, unique

FIXTURES = Path(__file__).resolve().parent / "fixtures"
NY = ZoneInfo("America/New_York")
# Fixed clock inside the synthetic promo windows (fixtures expire 2026-06-30 23:59 New York).
NOW = datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc)
AFTER_PROMO = datetime(2026, 7, 2, 12, 0, tzinfo=timezone.utc)


def fixture(name):
    return (FIXTURES / f"{name}.html").read_text()


def sheet_row(**values):
    """A Sheet row with the columns build() guards; values override defaults."""
    row = {"key": "", "firm_key": "", "firm_name": "", "account_label": "", "account_size_usd": "",
           "eval_cost_usd": "", "activation_fee_usd": "", "discount_code": "", "discount_pct": "",
           "discounted_eval_usd": ""}
    row.update(values)
    return row


class CollectorTests(unittest.TestCase):
    def test_literal_does_not_execute_javascript(self):
        with self.assertRaises(ValueError):
            literal('const data = {price: fetch("https://bad.example")};', r'const data =\s*')
        self.assertEqual(literal("const data = {x: 'brace }', a: [1, /* } */ 2]};", r'const data =\s*'),
                         {"x": "brace }", "a": [1, 2]})

    def test_duplicate_data_blocks_fail_closed(self):
        with self.assertRaises(ValueError):
            literal('const data = {}; const data = {};', r'const data =\s*')

    def test_unknown_is_never_zero(self):
        for value in (None, '', 'None', True):
            with self.assertRaises(ValueError):
                money(value)
        self.assertEqual(money(0), '0')

    def test_platform_disagreement_fails_closed(self):
        with self.assertRaises(ValueError):
            unique(['99', '109'])

    def test_source_outage_cannot_create_patches(self):
        row = {"firm_key": "apex", "key": "apex-50", "firm_name": "Apex"}
        result = build([row], {"apex": "HTTPError: 503"}, datetime.now(timezone.utc))
        self.assertEqual(result['patches'], [])
        self.assertEqual(len(result['review']), 1)

    def test_missing_activation_is_not_filled_with_zero(self):
        row = {'account_label': 'S2F 25K', 'account_size_usd': '25000',
               'discount_code': '', 'discount_pct': '0', 'discounted_eval_usd': ''}
        html = 'const PS_DATA = {"S2F":{"sizes":{"25K":{"capital":25000,"price":222}}}};'
        fields, verified, _, _ = daytraders(html, row, datetime.now(timezone.utc))
        self.assertTrue(verified)
        self.assertNotIn('activation_fee_usd', fields)


class FixtureSafetyTests(unittest.TestCase):
    def test_fixtures_are_marked_synthetic(self):
        for name in ("tradeify", "daytraders", "apex", "lucid", "blue-guardian"):
            with self.subTest(fixture=name):
                self.assertIn("SYNTHETIC TEST FIXTURE", fixture(name))


class TradeifyAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="tradeify-growth-25k", firm_key="tradeify", firm_name="Tradeify",
                        account_label="Growth", account_size_usd="25000", discount_code="TESTCODE")
        return sheet_row(**{**defaults, **values})

    def test_growth_price_coupon_and_rounded_discount(self):
        fields, verified, expires, evidence = tradeify(fixture("tradeify"), self.row(), NOW)
        self.assertIs(verified, True)
        # Hidden broker (777) and hidden sizes are ignored; visible brokers agree on 999.
        self.assertEqual(fields, {"eval_cost_usd": "999", "activation_fee_usd": "0",
                                  "discount_code": "TESTCODE", "discount_pct": "10",
                                  "discounted_eval_usd": "899"})  # 999 * 0.9 = 899.1, site rounds to 899
        self.assertEqual(expires, datetime(2026, 6, 30, 23, 59, tzinfo=NY))
        self.assertEqual(evidence, "Tradeify Growth, 25000, all visible brokers agree")

    def test_exact_fractional_discount_needs_no_override(self):
        row = self.row(key="tradeify-select-100k", account_label="Select", account_size_usd="100000")
        fields, verified, _, _ = tradeify(fixture("tradeify"), row, NOW)
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "888")
        self.assertEqual(fields["discount_pct"], "25")
        self.assertEqual(fields["discounted_eval_usd"], "")  # 888 * 0.75 = 666 exactly

    def test_non_none_activation_fee_is_not_assumed_zero(self):
        fields, _, _, _ = tradeify(fixture("tradeify"), self.row(account_size_usd="50000"), NOW)
        self.assertEqual(fields["eval_cost_usd"], "888")
        self.assertNotIn("activation_fee_usd", fields)

    def test_unknown_sheet_code_is_preserved_and_pricing_unverified(self):
        with mock.patch.object(collect, "prior_approved_tradeify_codes", return_value=set()):
            fields, verified, expires, _ = tradeify(fixture("tradeify"), self.row(discount_code="FAKEAFFILIATE"), NOW)
        self.assertIs(verified, False)
        self.assertEqual(fields, {"eval_cost_usd": "999", "activation_fee_usd": "0"})
        self.assertEqual(expires, NOW + timedelta(hours=18))

    def test_expired_coupon_is_not_verified(self):
        fields, verified, expires, _ = tradeify(fixture("tradeify"), self.row(), AFTER_PROMO)
        self.assertIs(verified, False)
        self.assertNotIn("discount_code", fields)
        self.assertEqual(expires, AFTER_PROMO + timedelta(hours=18))

    def test_hidden_plan_and_unknown_label_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "No matching product"):
            tradeify(fixture("tradeify"), self.row(account_label="Lightning", account_size_usd="50000"), NOW)
        with self.assertRaisesRegex(ValueError, "Unknown Tradeify plan label"):
            tradeify(fixture("tradeify"), self.row(account_label="Straight"), NOW)

    def test_build_publishes_verified_patch_with_promotion_expiry(self):
        result = build([self.row(eval_cost_usd="999", discount_pct="10")], {"tradeify": fixture("tradeify")}, NOW)
        self.assertEqual(result["review"], [])
        [patch] = result["patches"]
        self.assertEqual(patch["key"], "tradeify-growth-25k")
        self.assertEqual(patch["values"]["discount_code"], "TESTCODE")
        self.assertEqual(patch["expected"]["discount_code"], "TESTCODE")
        self.assertEqual(patch["promotionExpiresAt"], datetime(2026, 6, 30, 23, 59, tzinfo=NY).isoformat())
        self.assertEqual(patch["expiresAt"], (NOW + timedelta(hours=18)).isoformat())


class DayTradersAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="daytraders-s2f-25k", firm_key="daytraders", firm_name="DayTraders",
                        account_label="S2F 25K", account_size_usd="25000",
                        discount_code="", discount_pct="0", discounted_eval_usd="")
        return sheet_row(**{**defaults, **values})

    def test_price_activation_fee_and_qualifying_days(self):
        fields, verified, expires, evidence = daytraders(fixture("daytraders"), self.row(), NOW)
        self.assertEqual(fields, {"eval_cost_usd": "999", "activation_fee_usd": "888", "min_days (Eval)": "7"})
        self.assertIs(verified, True)  # Sheet has no coupon, so the list price is publishable
        self.assertEqual(expires, NOW + timedelta(hours=18))
        self.assertEqual(evidence, "DayTraders S2F 25K, single-account price")

    def test_group_disambiguates_same_capital(self):
        fields, _, _, evidence = daytraders(fixture("daytraders"), self.row(account_label="Trail 50K", account_size_usd="50000"), NOW)
        self.assertEqual(fields, {"eval_cost_usd": "777", "activation_fee_usd": "0"})  # non-numeric min days skipped
        self.assertEqual(evidence, "DayTraders Trailing 50K, single-account price")
        fields, _, _, _ = daytraders(fixture("daytraders"), self.row(account_label="S2F 50K", account_size_usd="50000"), NOW)
        self.assertEqual(fields, {"eval_cost_usd": "888"})

    def test_sheet_coupon_holds_pricing(self):
        _, verified, _, _ = daytraders(fixture("daytraders"), self.row(discount_code="FAKEPROMO", discount_pct="10"), NOW)
        self.assertIs(verified, False)

    def test_conflicting_variants_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "disagree"):
            daytraders(fixture("daytraders"), self.row(account_label="Conflict 100K", account_size_usd="100000"), NOW)


class ApexAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="apex-intraday-standard-50k", firm_key="apex", firm_name="Apex",
                        account_label="Intraday Standard", account_size_usd="50000", discount_code="TESTCODE")
        return sheet_row(**{**defaults, **values})

    def test_intraday_standard_price_activation_and_promo(self):
        fields, verified, expires, evidence = apex(fixture("apex"), self.row(), NOW)
        self.assertIs(verified, True)
        # Bundles, multi-packs, hidden and non-eval products (111-444) are ignored.
        self.assertEqual(fields, {"eval_cost_usd": "999", "activation_fee_usd": "777",
                                  "discount_code": "TESTCODE", "discount_pct": "20", "discounted_eval_usd": ""})
        self.assertEqual(expires, datetime(2026, 6, 30, 23, 59, tzinfo=NY))
        self.assertEqual(evidence, "Apex RealTime, 50000, free_activation=False")

    def test_eod_no_activation_fee_label_and_inactive_promo(self):
        row = self.row(key="apex-eod-no-activation-50k", account_label="EOD No Activation Fee")
        fields, verified, expires, evidence = apex(fixture("apex"), row, NOW)
        self.assertIs(verified, False)  # EndOfDay promo is inactive
        self.assertEqual(fields, {"eval_cost_usd": "888", "activation_fee_usd": "0"})
        self.assertEqual(expires, NOW + timedelta(hours=18))
        self.assertEqual(evidence, "Apex EndOfDay, 50000, free_activation=True")

    def test_promo_code_mismatch_or_expiry_is_not_verified(self):
        fields, verified, _, _ = apex(fixture("apex"), self.row(discount_code="FAKEAFFILIATE"), NOW)
        self.assertIs(verified, False)
        self.assertNotIn("discount_code", fields)
        _, verified, expires, _ = apex(fixture("apex"), self.row(), AFTER_PROMO)
        self.assertIs(verified, False)
        self.assertEqual(expires, AFTER_PROMO + timedelta(hours=18))

    def test_unknown_label_or_size_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unknown Apex plan label"):
            apex(fixture("apex"), self.row(account_label="Intraday Static"), NOW)
        with self.assertRaisesRegex(ValueError, "No matching product"):
            apex(fixture("apex"), self.row(account_size_usd="25000"), NOW)


class LucidAdapterTests(unittest.TestCase):
    def row(self, **values):
        # The Sheet stores the Lucid plan identity in firm_key (see row_identity).
        defaults = dict(key="lucid", firm_key="lucid-pro-25k", firm_name="Lucid Trading",
                        account_label="Pro", account_size_usd="25000")
        return sheet_row(**{**defaults, **values})

    def test_headline_price_and_eod_drawdown(self):
        fields, verified, expires, evidence = lucid(fixture("lucid"), self.row(), NOW)
        self.assertEqual(fields, {"eval_cost_usd": "999", "ddt": "EOD"})
        self.assertIs(verified, False)
        self.assertEqual(expires, NOW + timedelta(hours=18))
        self.assertEqual(evidence, "Lucid pro 25K, product SYN-PRO-25")

    def test_coupon_is_never_verified_and_intraday_ddt_not_set(self):
        fields, verified, _, _ = lucid(fixture("lucid"), self.row(firm_key="lucid-pro-50k", discount_code="TESTCODE"), NOW)
        self.assertIs(verified, False)
        self.assertEqual(fields, {"eval_cost_usd": "888"})

    def test_daily_variants_and_disabled_plans_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "selectable variants"):
            lucid(fixture("lucid"), self.row(firm_key="lucid-daily-25k"), NOW)
        with self.assertRaisesRegex(ValueError, "No matching product"):
            lucid(fixture("lucid"), self.row(firm_key="lucid-flex-25k"), NOW)
        with self.assertRaisesRegex(ValueError, "Unknown Lucid plan identity"):
            lucid(fixture("lucid"), self.row(firm_key="lucid-pro-75k"), NOW)

    def test_build_holds_lucid_pricing_for_review(self):
        result = build([self.row(eval_cost_usd="1")], {"lucid": fixture("lucid")}, NOW)
        [review] = result["review"]
        self.assertEqual(review["key"], "lucid-pro-25k")
        self.assertEqual(review["proposed"], {"eval_cost_usd": "999"})
        [patch] = result["patches"]
        self.assertEqual(patch["values"], {"ddt": "EOD"})  # only the non-price field is published
        self.assertNotIn("promotionExpiresAt", patch)



class BlueGuardianAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="blue-guardian-standard-25k", firm_key="blue-guardian", firm_name="Blue Guardian",
                        account_label="Standard 25K", account_size_usd="25000", eval_cost_usd="1",
                        discount_code="TESTCODE", discount_pct="25")
        return sheet_row(**{**defaults, **values})

    def test_regular_price_when_all_copies_and_platforms_agree(self):
        fields, verified, expires, evidence = blue_guardian(fixture("blue-guardian"), self.row(), NOW)
        self.assertEqual(fields, {"eval_cost_usd": "999"})
        self.assertFalse(verified)
        self.assertEqual(expires, NOW + timedelta(hours=18))
        self.assertIn("sale 666", evidence)
        self.assertIn("deepcharts, tradovate", evidence)

    def test_cfd_products_are_ignored(self):
        with self.assertRaises(ValueError):
            blue_guardian(fixture("blue-guardian"), self.row(account_label="Direct 25K"), NOW)

    def test_derived_fractional_regular_price_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "derived"):
            blue_guardian(fixture("blue-guardian"), self.row(account_label="Reserve 50K", account_size_usd="50000"), NOW)

    def test_platform_disagreement_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "disagree"):
            blue_guardian(fixture("blue-guardian"), self.row(account_label="Express 100K", account_size_usd="100000"), NOW)

    def test_label_and_size_must_agree(self):
        for label, size in (("Standard 25K", "50000"), ("Instant 25K", "25000")):
            with self.subTest(label=label), self.assertRaises(ValueError):
                blue_guardian(fixture("blue-guardian"), self.row(account_label=label, account_size_usd=size), NOW)

    def test_build_holds_price_for_review_and_never_publishes(self):
        result = build([self.row()], {"blue-guardian": fixture("blue-guardian")}, NOW)
        self.assertEqual(result["patches"], [])
        self.assertEqual(result["review"][0]["proposed"], {"eval_cost_usd": "999"})
        self.assertNotIn("blue-guardian", result["unsupportedFirms"])


if __name__ == '__main__':
    unittest.main()
