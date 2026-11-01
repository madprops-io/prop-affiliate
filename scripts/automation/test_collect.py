import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo

import collect
from collect import (apex, blue_guardian, build, daytraders, fundednext, literal,
                     lucid, money, my_funded_futures, top_one_futures, tradeday,
                     tradeify, unique)

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

    def test_non_affiliate_or_blank_code_takes_current_public_code(self):
        for current in ("OLDSALE", ""):
            with self.subTest(current=current):
                fields, verified, _, _ = tradeify(fixture("tradeify"), self.row(discount_code=current), NOW)
                self.assertIs(verified, True)
                self.assertEqual(fields["discount_code"], "TESTCODE")
                self.assertEqual(fields["discount_pct"], "10")

    def test_affiliate_code_is_kept_and_takes_promotion_discount(self):
        for code in ("MAD", "MADPROPS", "madprops"):
            with self.subTest(code=code):
                fields, verified, _, _ = tradeify(fixture("tradeify"), self.row(discount_code=code), NOW)
                self.assertIs(verified, True)
                self.assertEqual(fields["discount_code"], code)
                self.assertEqual((fields["discount_pct"], fields["discounted_eval_usd"]), ("10", "899"))

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

    def test_affiliate_code_kept_other_codes_replaced_and_expiry_not_verified(self):
        fields, verified, _, _ = apex(fixture("apex"), self.row(discount_code="OLDSALE"), NOW)
        self.assertIs(verified, True)
        self.assertEqual(fields["discount_code"], "TESTCODE")
        fields, verified, _, _ = apex(fixture("apex"), self.row(discount_code="MAD"), NOW)
        self.assertEqual((verified, fields["discount_code"], fields["discount_pct"]), (True, "MAD", "20"))
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
                        discount_code="OLDSALE", discount_pct="25")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return blue_guardian(fixture("blue-guardian"), self.row(**values), NOW)

    def test_public_code_replaces_non_affiliate_code(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        # 999 * 0.7 = 699.3; the site shows 699, so the exact sale price is kept.
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "TESTCODE",
                                  "discount_pct": "30", "discounted_eval_usd": "699"})
        self.assertIsNone(expires)  # the site publishes no promotion end date
        self.assertIn("code TESTCODE", evidence)

    def test_affiliate_code_is_kept_with_promotion_discount(self):
        fields, verified, _, _ = self.run_adapter(discount_code="MADPROPS")
        self.assertIs(verified, True)
        self.assertEqual((fields["discount_code"], fields["discount_pct"]), ("MADPROPS", "30"))

    def test_disabled_plan_and_cfd_products_are_ignored(self):
        with self.assertRaisesRegex(ValueError, "No matching product"):
            self.run_adapter(account_label="Direct 25K")

    def test_derived_fractional_regular_price_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "derived"):
            self.run_adapter(account_label="Reserve 50K", account_size_usd="50000")

    def test_platform_disagreement_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "disagree"):
            self.run_adapter(account_label="Express 100K", account_size_usd="100000")

    def test_plan_and_product_price_mismatch_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "plan and product prices disagree"):
            self.run_adapter(account_label="Standard 150K", account_size_usd="150000")

    def test_sale_price_must_match_coupon(self):
        with self.assertRaisesRegex(ValueError, "does not match its coupon"):
            self.run_adapter(account_label="Standard 50K", account_size_usd="50000")

    def test_label_and_size_must_agree(self):
        for label, size in (("Standard 25K", "50000"), ("Instant 25K", "25000")):
            with self.subTest(label=label), self.assertRaises(ValueError):
                self.run_adapter(account_label=label, account_size_usd=size)

    def test_build_publishes_without_persistent_promotion_expiry(self):
        result = build([self.row()], {"blue-guardian": fixture("blue-guardian")}, NOW)
        self.assertEqual(result["review"], [])
        [patch] = result["patches"]
        self.assertEqual(patch["values"]["discount_code"], "TESTCODE")
        self.assertEqual(patch["expiresAt"], (NOW + timedelta(hours=18)).isoformat())
        self.assertNotIn("promotionExpiresAt", patch)

class MFFUAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="mffu-rapid-25k", firm_key="my-funded-futures", firm_name="My Funded Futures",
                        account_label="Rapid 25K", account_size_usd="25000", eval_cost_usd="1",
                        discount_code="OLDSALE", discount_pct="10")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return my_funded_futures(fixture("my-funded-futures"), self.row(**values), NOW)

    def test_public_code_replaces_non_affiliate_code(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "999")
        self.assertEqual(fields["discount_code"], "TESTCODE")
        self.assertEqual(fields["discount_pct"], "50")
        self.assertIsNone(expires)
        self.assertIn("MFFU", evidence)

    def test_affiliate_code_is_kept(self):
        fields, verified, _, _ = self.run_adapter(discount_code="MAD")
        self.assertIs(verified, True)
        self.assertEqual(fields["discount_code"], "MAD")
        self.assertEqual(fields["discount_pct"], "50")

    def test_different_category_and_size(self):
        fields, verified, _, _ = self.run_adapter(
            key="mffu-rapid-50k", account_label="Rapid 50K", account_size_usd="50000")
        self.assertEqual(fields["eval_cost_usd"], "888")

    def test_inactive_product_not_found(self):
        with self.assertRaisesRegex(ValueError, "found 0"):
            self.run_adapter(key="mffu-builder-50k", account_label="Builder 50K",
                             account_size_usd="50000")

    def test_label_size_mismatch(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Rapid 25K", account_size_usd="50000")

    def test_unknown_category(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Quantum 25K")

    def test_build_publishes_patch_without_promo_expiry(self):
        result = build([self.row()], {"my-funded-futures": fixture("my-funded-futures")}, NOW)
        self.assertEqual(result["review"], [])
        [patch] = result["patches"]
        self.assertEqual(patch["values"]["discount_code"], "TESTCODE")
        self.assertNotIn("promotionExpiresAt", patch)

    def test_sale_price_computed_correctly(self):
        fields, _, _, _ = self.run_adapter()
        # 999 * 0.5 = 499.5
        self.assertEqual(fields["discounted_eval_usd"], "499.5")


class TradeDayAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="tradeday-quick-pay-intraday-25k", firm_key="tradeday", firm_name="TradeDay",
                        account_label="Quick Pay Intraday", account_size_usd="25000", eval_cost_usd="1",
                        discount_code="OLDSALE", discount_pct="10")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return tradeday(fixture("tradeday"), self.row(**values), NOW)

    def test_public_code_replaces_non_affiliate_code(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "999")
        self.assertEqual(fields["discount_code"], "TESTCODE")
        self.assertEqual(fields["discount_pct"], "55")
        self.assertEqual(fields["discounted_eval_usd"], "450")
        self.assertIsNone(expires)
        self.assertIn("TradeDay", evidence)

    def test_affiliate_code_is_kept(self):
        fields, verified, _, _ = self.run_adapter(discount_code="MADPROPS")
        self.assertEqual(fields["discount_code"], "MADPROPS")

    def test_eod_plan(self):
        fields, verified, _, _ = self.run_adapter(
            key="tradeday-quick-pay-eod-50k", account_label="Quick Pay EOD",
            account_size_usd="50000")
        self.assertEqual(fields["eval_cost_usd"], "888")
        self.assertEqual(fields["discount_pct"], "55")

    def test_platform_disagreement_fails_closed(self):
        # Fast Pass EOD 25k has two cards with different sale prices
        with self.assertRaisesRegex(ValueError, "disagree"):
            self.run_adapter(key="tradeday-fast-pass-eod-25k",
                             account_label="Fast Pass EOD", account_size_usd="25000")

    def test_sale_price_must_match_discount_badge(self):
        # Quick Pay Intraday 50k: 666 with 55% badge → exact should be 300, but shows 200
        with self.assertRaisesRegex(ValueError, "does not match"):
            self.run_adapter(key="tradeday-quick-pay-intraday-50k",
                             account_label="Quick Pay Intraday", account_size_usd="50000")

    def test_unknown_label(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Express 25K")

    def test_no_matching_card(self):
        with self.assertRaisesRegex(ValueError, "No TradeDay card"):
            self.run_adapter(account_label="Quick Pay Intraday", account_size_usd="150000")

    def test_build_publishes_patch(self):
        result = build([self.row()], {"tradeday": fixture("tradeday")}, NOW)
        self.assertEqual(result["review"], [])
        [patch] = result["patches"]
        self.assertEqual(patch["values"]["discount_code"], "TESTCODE")


class FundedNextAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="fundednext-futures-rapid-daily-25k", firm_key="fundednext",
                        firm_name="FundedNext", account_label="Rapid Daily",
                        account_size_usd="25000", eval_cost_usd="1",
                        discount_code="OLDSALE", discount_pct="10")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return fundednext(fixture("fundednext"), self.row(**values), NOW)

    def test_rapid_daily_price_and_discount(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "150")
        self.assertEqual(fields["discount_code"], "RAPID")
        self.assertEqual(fields["discount_pct"], "50")
        self.assertIsNone(expires)
        self.assertIn("FundedNext", evidence)

    def test_affiliate_code_is_kept(self):
        fields, verified, _, _ = self.run_adapter(discount_code="MAD")
        self.assertIs(verified, True)
        self.assertEqual(fields["discount_code"], "MAD")

    def test_flex_package(self):
        fields, verified, _, _ = self.run_adapter(
            key="fundednext-futures-flex-50k", account_label="Flex",
            account_size_usd="50000")
        self.assertEqual(fields["eval_cost_usd"], "200")
        self.assertEqual(fields["discount_pct"], "40")

    def test_rapid_pro_variant(self):
        fields, verified, _, _ = self.run_adapter(
            key="fundednext-futures-rapid-pro-25k", account_label="Rapid Pro",
            account_size_usd="25000")
        self.assertEqual(fields["eval_cost_usd"], "150")

    def test_dll_addon_not_on_storefront(self):
        with self.assertRaisesRegex(ValueError, "not on the storefront"):
            self.run_adapter(account_label="Rapid Pro DLL Add-On")

    def test_legacy_not_on_storefront(self):
        with self.assertRaisesRegex(ValueError, "not on the storefront"):
            self.run_adapter(account_label="Legacy")

    def test_unknown_label(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Quantum 25K")

    def test_no_matching_size(self):
        with self.assertRaisesRegex(ValueError, "found 0"):
            self.run_adapter(account_label="Rapid Daily", account_size_usd="150000")

    def test_sale_price_must_match_badge(self):
        # Rapid Daily 50K: orig=300, badge=43% OFF → exact=171, disc=170 → |170-171|=1 ≤ 1 → OK
        fields, verified, _, _ = self.run_adapter(
            key="fundednext-futures-rapid-daily-50k", account_label="Rapid Daily",
            account_size_usd="50000")
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "300")

    def test_build_publishes_patch_without_promo_expiry(self):
        result = build([self.row()], {"fundednext": fixture("fundednext")}, NOW)
        self.assertEqual(result["review"], [])
        [patch] = result["patches"]
        self.assertEqual(patch["values"]["discount_code"], "RAPID")
        self.assertNotIn("promotionExpiresAt", patch)


class TopOneFuturesAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="topone-elite-daily-25k", firm_key="top-one-futures",
                        firm_name="Top One Futures", account_label="Elite Daily",
                        account_size_usd="25000", eval_cost_usd="1",
                        discount_code="OLDSALE", discount_pct="10")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return top_one_futures(fixture("top-one-futures"), self.row(**values), NOW)

    def test_elite_daily_price_and_discount(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "200")
        self.assertEqual(fields["discount_code"], "BOO")
        self.assertEqual(fields["discount_pct"], "50")
        self.assertIsNone(expires)
        self.assertIn("Top One", evidence)

    def test_affiliate_code_is_kept(self):
        fields, verified, _, _ = self.run_adapter(discount_code="MADPROPS")
        self.assertEqual(fields["discount_code"], "MADPROPS")

    def test_elite_daily_50k(self):
        fields, verified, _, _ = self.run_adapter(
            key="topone-elite-daily-50k", account_size_usd="50000")
        self.assertEqual(fields["eval_cost_usd"], "300")
        self.assertEqual(fields["discount_pct"], "50")

    def test_elite_access_no_verified_discount(self):
        fields, verified, _, _ = self.run_adapter(
            key="topone-elite-access-25k", account_label="Elite Access",
            account_size_usd="25000")
        self.assertIs(verified, False)
        self.assertEqual(fields["eval_cost_usd"], "139")
        self.assertNotIn("discount_code", fields)

    def test_instant_sim_funded(self):
        fields, verified, _, _ = self.run_adapter(
            key="topone-instant-2-25k", account_label="Instant Sim Funded 2.0",
            account_size_usd="25000")
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "500")
        self.assertEqual(fields["discount_pct"], "45")

    def test_ignite_instant_funding(self):
        fields, verified, _, _ = self.run_adapter(
            key="topone-ignite-25k", account_label="Ignite Instant Funding",
            account_size_usd="25000")
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "400")
        self.assertEqual(fields["discount_pct"], "50")

    def test_unknown_label(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Premium 25K")

    def test_no_matching_card(self):
        with self.assertRaisesRegex(ValueError, "No Top One card"):
            self.run_adapter(account_size_usd="200000")

    def test_build_publishes_patch(self):
        result = build([self.row()], {"top-one-futures": fixture("top-one-futures")}, NOW)
        self.assertEqual(result["review"], [])
        [patch] = result["patches"]
        self.assertEqual(patch["values"]["discount_code"], "BOO")
        self.assertNotIn("promotionExpiresAt", patch)


if __name__ == '__main__':
    unittest.main()


class BulenoxAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="bulenox-qualification-opt1-25k", firm_key="bulenox", firm_name="Bulenox",
                        account_label="Qualification Option 1", account_size_usd="25000",
                        eval_cost_usd="1", discount_code="MAD", discount_pct="89")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return collect.bulenox(fixture("bulenox"), self.row(**values), NOW)

    def test_qualification_reads_separately_declared_tiers(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields, {"eval_cost_usd": "111"})
        self.assertIsNone(expires)
        self.assertIn("managed manually", evidence)

    def test_options_share_price_and_inline_tiers(self):
        self.assertEqual(self.run_adapter(account_label="Qualification Option 2", account_size_usd="150000")[0],
                         {"eval_cost_usd": "444"})
        self.assertEqual(self.run_adapter(account_label="Fast Track Option 2", account_size_usd="50000")[0],
                         {"eval_cost_usd": "666"})
        self.assertEqual(self.run_adapter(account_label="Momentum Option 1", account_size_usd="150000")[0],
                         {"eval_cost_usd": "44.5"})

    def test_discount_fields_are_never_touched(self):
        for label in ("Qualification Option 1", "Fast Track Option 1", "Momentum Option 2"):
            fields, _, _, _ = self.run_adapter(account_label=label)
            self.assertEqual(set(fields), {"eval_cost_usd"})

    def test_build_publishes_price_only_patch(self):
        result = build([self.row()], {"bulenox": fixture("bulenox")}, NOW)
        self.assertEqual(result["review"], [])
        self.assertEqual(result["patches"][0]["values"], {"eval_cost_usd": "111"})
        self.assertEqual(result["patches"][0]["expected"]["discount_code"], "MAD")
        self.assertNotIn("promotionExpiresAt", result["patches"][0])

    def test_fixed_discounted_price_blocks_price_change(self):
        with self.assertRaises(ValueError):
            self.run_adapter(discounted_eval_usd="50")
        fields, _, _, _ = self.run_adapter(eval_cost_usd="111", discounted_eval_usd="50")
        self.assertEqual(fields["eval_cost_usd"], "111")

    def test_unknown_label_or_missing_program_fails_closed(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Qualification")
        with self.assertRaises(ValueError):
            self.run_adapter(account_size_usd="75000")
        with self.assertRaises(ValueError):
            collect.bulenox("var Ai=[{id:`momentum`,tiers:[]}]", self.row(), NOW)

    def test_bundle_is_located_from_the_page(self):
        pages = {"https://bulenox.com/": '<script type="module" crossorigin src="/assets/index-AbC_1.js"></script>',
                 "https://bulenox.com/assets/index-AbC_1.js": "BUNDLE"}
        original = collect.fetch
        collect.fetch = lambda url, browser=False: pages[url]
        try:
            self.assertEqual(collect.fetch_source("bulenox", "https://bulenox.com/"), "BUNDLE")
            pages["https://bulenox.com/"] += '<script src="/assets/index-Other.js"></script>'
            with self.assertRaises(ValueError):
                collect.fetch_source("bulenox", "https://bulenox.com/")
        finally:
            collect.fetch = original


class PhidiasAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="phidias-express-to-live-25k", firm_key="phidias", firm_name="Phidias",
                        account_label="Express to Live", account_size_usd="25000",
                        eval_cost_usd="1", discount_code="MADPROPS", discount_pct="80")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return collect.phidias(fixture("phidias"), self.row(**values), NOW)

    def test_one_time_price_and_otp_discount(self):
        fields, verified, expires, _ = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "MADPROPS",
                                  "discount_pct": "15", "discounted_eval_usd": ""})
        self.assertIsNone(expires)

    def test_non_affiliate_code_takes_public_code(self):
        fields, _, _, _ = self.run_adapter(account_label="Fundamental", account_size_usd="50000",
                                           discount_code="OLD")
        self.assertEqual((fields["eval_cost_usd"], fields["discount_code"], fields["discount_pct"]),
                         ("777", "FAKEPROMO", "35"))

    def test_zero_discount_is_held_for_review(self):
        fields, verified, _, _ = self.run_adapter(account_label="Premium", account_size_usd="100000")
        self.assertIs(verified, False)
        self.assertEqual(fields, {"eval_cost_usd": "666"})

    def test_unknown_plan_or_size_fails_closed(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Challenge")
        with self.assertRaises(KeyError):
            self.run_adapter(account_size_usd="150000")


class AlphaFuturesAdapterTests(unittest.TestCase):
    def row(self, **values):
        defaults = dict(key="alpha-zero-50k", firm_key="alphafutures", firm_name="Alpha Futures",
                        account_label="Zero", account_size_usd="50000",
                        eval_cost_usd="1", discount_code="ALPHA40", discount_pct="40")
        return sheet_row(**{**defaults, **values})

    def run_adapter(self, **values):
        return collect.alpha_futures(fixture("alphafutures"), self.row(**values), NOW)

    def test_zero_uses_its_own_offer(self):
        fields, verified, _, _ = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "FAKEZERO",
                                  "discount_pct": "15", "discounted_eval_usd": ""})

    def test_direct_reads_qualified_card(self):
        fields, _, _, _ = self.run_adapter(account_label="Direct", account_size_usd="25000",
                                           discount_code="MAD")
        self.assertEqual((fields["eval_cost_usd"], fields["discount_code"], fields["discount_pct"]),
                         ("1777", "MAD", "25"))

    def test_plan_without_offer_is_held(self):
        fields, verified, _, _ = self.run_adapter(account_label="Advanced")
        self.assertIs(verified, False)
        self.assertEqual(fields, {"eval_cost_usd": "666"})

    def test_conflicting_or_missing_cards_fail_closed(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Standard", account_size_usd="150000")
        with self.assertRaises(ValueError):
            self.run_adapter(account_size_usd="25000")


class NewFixtureSafetyTests(unittest.TestCase):
    def test_new_fixtures_are_marked_synthetic(self):
        for name in ("bulenox", "phidias", "alphafutures", "legendstrading", "fundedfutures", "e8futures", "purdia",
                     "aquafutures", "blusky-trading", "takeprofittrader", "traderslaunch"):
            with self.subTest(fixture=name):
                self.assertIn("SYNTHETIC TEST FIXTURE", fixture(name))


class LegendsTradingAdapterTests(unittest.TestCase):
    def run_adapter(self, **values):
        defaults = dict(key="legends-trading-elite-50k", firm_key="legendstrading", firm_name="Legends Trading",
                        account_label="Elite 50K", account_size_usd="50000",
                        eval_cost_usd="1", discount_code="LTG", discount_pct="30")
        return collect.legends_trading(fixture("legendstrading"), sheet_row(**{**defaults, **values}), NOW)

    def test_price_and_derived_percentage(self):
        fields, verified, expires, _ = self.run_adapter()
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "FAKEPROMO",
                                  "discount_pct": "35", "discounted_eval_usd": ""})

    def test_affiliate_code_is_kept(self):
        fields, _, _, _ = self.run_adapter(account_label="Apprentice 50K", discount_code="MADPROPS")
        self.assertEqual((fields["eval_cost_usd"], fields["discount_code"], fields["discount_pct"]),
                         ("100", "MADPROPS", "40"))

    def test_non_whole_or_missing_discount_is_held(self):
        for label, size in (("Elite 100K", "100000"), ("Elite 150K", "150000")):
            with self.subTest(label=label):
                fields, verified, _, _ = self.run_adapter(account_label=label, account_size_usd=size)
                self.assertIs(verified, False)
                self.assertEqual(set(fields), {"eval_cost_usd"})

    def test_ambiguous_or_mismatched_rows_fail_closed(self):
        for label, size in (("Apprentice 150K", "150000"), ("Elite 25K", "25000"),
                            ("Elite 50K", "100000"), ("Pro 50K", "50000")):
            with self.subTest(label=label), self.assertRaises(ValueError):
                self.run_adapter(account_label=label, account_size_usd=size)


class FundedFuturesAdapterTests(unittest.TestCase):
    def run_adapter(self, source=None, **values):
        defaults = dict(key="ffn-steady-50k", firm_key="fundedfutures", firm_name="Funded Futures Network",
                        account_label="STEADY", account_size_usd="50000",
                        eval_cost_usd="1", discount_code="DOUBLE50", discount_pct="50")
        return collect.funded_futures(source or fixture("fundedfutures"), sheet_row(**{**defaults, **values}), NOW)

    def test_matching_feed_coupons_are_verified(self):
        fields, verified, _, _ = self.run_adapter()
        self.assertIs(verified, True)
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "FAKEPROMO",
                                  "discount_pct": "40", "discounted_eval_usd": ""})
        fields, _, _, _ = self.run_adapter(account_label="MAX Standard", account_size_usd="100000")
        self.assertEqual(fields["eval_cost_usd"], "666")

    def test_best_feed_discount_is_used(self):
        source = fixture("fundedfutures").replace('"percent": 40, "type": "percentage", "valid": true}}',
                                                  '"percent": 25, "type": "percentage", "valid": true}}')
        fields, verified, _, evidence = self.run_adapter(source)
        self.assertIs(verified, True)
        self.assertEqual((fields["discount_code"], fields["discount_pct"]), ("FAKEPROMO", "40"))
        self.assertIn("best FAKEPROMO 40% on cqg", evidence)
        fields, _, _, _ = self.run_adapter(source, discount_code="MAD")
        self.assertEqual(fields["discount_code"], "MAD")

    def test_ambiguous_or_malformed_feeds_hold_the_coupon(self):
        tie = fixture("fundedfutures").replace('"rithmic": {"code": "FAKEPROMO"', '"rithmic": {"code": "OTHER"')
        flat = fixture("fundedfutures").replace('"percent": 40, "type": "percentage", "valid": true}}',
                                                '"percent": 90, "type": "fixed", "valid": true}}')
        for source in (tie, flat, fixture("fundedfutures").replace("data-coupon-platforms", "data-x")):
            with self.subTest():
                fields, verified, _, _ = self.run_adapter(source)
                self.assertIs(verified, False)
                self.assertEqual(fields, {"eval_cost_usd": "999"})
        invalid = fixture("fundedfutures").replace('"percent": 40, "type": "percentage", "valid": true}}',
                                                   '"percent": 90, "type": "percentage", "valid": false}}')
        fields, verified, _, _ = self.run_adapter(invalid)
        self.assertIs(verified, True)
        self.assertEqual(fields["discount_pct"], "40")

    def test_monthly_unknown_or_missing_plans_fail_closed(self):
        for label, size in (("STEADY", "100000"), ("STEADY", "25000"), ("Static", "50000")):
            with self.subTest(label=label, size=size), self.assertRaises(ValueError):
                self.run_adapter(account_label=label, account_size_usd=size)

    def test_build_holds_pricing_when_coupon_unverified(self):
        source = fixture("fundedfutures").replace('"code": "FAKEPROMO", "percent": 40, "type": "percentage", "valid": true}}',
                                                  '"code": "OTHER", "percent": 40, "type": "percentage", "valid": true}}')
        row = sheet_row(key="ffn-steady-50k", firm_key="fundedfutures", firm_name="FFN",
                        account_label="STEADY", account_size_usd="50000", eval_cost_usd="1")
        result = build([row], {"fundedfutures": source}, NOW)
        self.assertEqual(result["patches"], [])
        self.assertEqual(result["review"][0]["proposed"], {"eval_cost_usd": "999"})


class E8FuturesAdapterTests(unittest.TestCase):
    def run_adapter(self, source=None, **values):
        defaults = dict(key="e8-signature-25k", firm_key="e8futures", firm_name="E8 Futures",
                        account_label="Signature", account_size_usd="25000",
                        eval_cost_usd="1", discount_code="E8", discount_pct="25")
        return collect.e8_futures(source or fixture("e8futures"), sheet_row(**{**defaults, **values}), NOW)

    def test_price_and_coupon_from_nuxt_payload(self):
        fields, verified, expires, _ = self.run_adapter()
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "FAKEPROMO",
                                  "discount_pct": "25", "discounted_eval_usd": ""})

    def test_affiliate_code_is_kept_and_tier_agreement_checked(self):
        fields, verified, _, _ = self.run_adapter(account_label="Zero MAX", account_size_usd="50000",
                                                  discount_code="MADPROPS")
        self.assertIs(verified, True)
        self.assertEqual((fields["eval_cost_usd"], fields["discount_code"], fields["discount_pct"]),
                         ("777", "MADPROPS", "35"))
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Zero MAX", account_size_usd="100000")

    def test_first_purchase_discount_mismatch_holds_coupon(self):
        fields, verified, _, _ = self.run_adapter(account_label="Zero Starter", account_size_usd="50000")
        self.assertIs(verified, False)
        self.assertEqual(fields, {"eval_cost_usd": "555"})

    def test_missing_size_unknown_label_or_payload_fails_closed(self):
        for label, size in (("Signature", "150000"), ("Zero Starter", "200000"), ("One", "50000")):
            with self.subTest(label=label, size=size), self.assertRaises(ValueError):
                self.run_adapter(account_label=label, account_size_usd=size)
        with self.assertRaises(ValueError):
            self.run_adapter("<html>no payload</html>")
        with self.assertRaises(ValueError):
            collect.nuxt_data('<script id="__NUXT_DATA__">[["Set", 1], 2]</script>', "x")


class PurdiaAdapterTests(unittest.TestCase):
    def run_adapter(self, source=None, **values):
        defaults = dict(key="purdia-instant-25k", firm_key="purdia", firm_name="Purdia",
                        account_label="Instant Funded", account_size_usd="25000",
                        eval_cost_usd="1", discount_code="", discount_pct="", discounted_eval_usd="")
        return collect.purdia(source or fixture("purdia"), sheet_row(**{**defaults, **values}), NOW)

    def test_discounted_catalogue_price_and_code(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        self.assertEqual(fields, {"eval_cost_usd": "888", "discount_code": "FAKEPROMO",
                                  "discount_pct": "75", "discounted_eval_usd": ""})
        self.assertIn("multiplier .25", evidence)

    def test_old_catalogue_is_ignored_and_affiliate_code_kept(self):
        fields, verified, _, _ = self.run_adapter(account_label="Pioneer Pilot", account_size_usd="100000",
                                                  discount_code="MADPROPS", discounted_eval_usd="499")
        self.assertIs(verified, True)
        self.assertEqual((fields["eval_cost_usd"], fields["discount_code"]), ("999", "MADPROPS"))
        fields, _, _, _ = self.run_adapter(account_label="EOD Evaluation", account_size_usd="50000")
        self.assertEqual(fields["eval_cost_usd"], "666")

    def test_missing_plans_and_broken_bundles_fail_closed(self):
        for label, size in (("Pro Evaluation", "100000"), ("Instant Funded", "50000"), ("Static", "25000")):
            with self.subTest(label=label, size=size), self.assertRaises(ValueError):
                self.run_adapter(account_label=label, account_size_usd=size)
        for broken in (fixture("purdia").replace("Sa=bw.map(gw)", "Sa=bw"),
                       fixture("purdia").replace('Qx="FAKEPROMO"', 'Qx=X'),
                       fixture("purdia").replace("*.25)", "*z)")):
            with self.subTest(), self.assertRaises(ValueError):
                self.run_adapter(broken)
        odd = fixture("purdia").replace("*.25)", "*.333)")
        fields, verified, _, _ = self.run_adapter(odd)
        self.assertIs(verified, False)
        self.assertEqual(fields, {"eval_cost_usd": "888"})


class AquaFuturesAdapterTests(unittest.TestCase):
    def run_adapter(self, source=None, **values):
        defaults = dict(key="aqua-futures-standard-50k", firm_key="aquafutures", firm_name="Aqua Futures",
                        account_label="Standard", account_size_usd="50000", eval_cost_usd="1",
                        discount_code="SHEETCODE", discount_pct="25")
        return collect.aqua_futures(source or fixture("aquafutures"), sheet_row(**{**defaults, **values}), NOW)

    def test_code_less_bulk_discount_is_verified_and_sheet_code_cleared(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        # The site shows Math.floor of the list price; the bulk discount needs no code.
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "", "discount_pct": "11",
                                  "discounted_eval_usd": ""})
        self.assertIn("list 999.99", evidence)
        self.assertIn("code-less 11% bulk discount", evidence)
        fields, verified, _, _ = self.run_adapter(account_label="Flex", discount_code="")
        self.assertIs(verified, True)
        self.assertEqual(fields, {"eval_cost_usd": "555", "discount_code": "", "discount_pct": "11",
                                  "discounted_eval_usd": ""})

    def test_affiliate_code_is_kept_with_bulk_discount(self):
        fields, verified, _, _ = self.run_adapter(account_label="Instant Standard", discount_code="MADPROPS")
        self.assertIs(verified, True)
        self.assertEqual(fields, {"eval_cost_usd": "777", "discount_code": "MADPROPS", "discount_pct": "11",
                                  "discounted_eval_usd": ""})

    def test_missing_zero_or_malformed_bulk_discount_holds_pricing(self):
        base = fixture("aquafutures")
        self.assertIn("bulkDiscount: { forex: 11, futures: 11 },", base)
        for replacement in ("", "bulkDiscount: { forex: 11 },", "bulkDiscount: { forex: 11, futures: 0 },",
                            "bulkDiscount: { forex: 11, futures: -5 },", "bulkDiscount: { forex: 11, futures: 101 },",
                            "bulkDiscount: { forex: 11, futures: 12.5 },", "bulkDiscount: { forex: 11, futures: '35' },",
                            "bulkDiscount: { forex: 11, futures: true },", "bulkDiscount: 35,"):
            with self.subTest(replacement=replacement):
                source = base.replace("bulkDiscount: { forex: 11, futures: 11 },", replacement)
                fields, verified, _, evidence = self.run_adapter(source)
                self.assertIs(verified, False)
                self.assertEqual(fields, {"eval_cost_usd": "999"})
                self.assertIn("no valid code-less bulk discount", evidence)

    def test_hidden_beginner_plans_fail_closed(self):
        for size in ("50000", "100000"):
            with self.subTest(size=size), self.assertRaisesRegex(ValueError, "beginner is hidden on the site"):
                self.run_adapter(account_label="Beginner", account_size_usd=size)

    def test_hidden_unoffered_disagreeing_or_unknown_plans_fail_closed(self):
        for label, size in (("Beginner", "50000"), ("Flex", "100000"), ("Instant Standard", "100000"),
                            ("Standard", "150000"), ("Pro", "50000")):
            with self.subTest(label=label, size=size), self.assertRaises((ValueError, KeyError)):
                self.run_adapter(account_label=label, account_size_usd=size)
        with self.assertRaises(ValueError):
            self.run_adapter("<html>no config</html>")

    def test_build_publishes_code_less_discount_patch(self):
        row = sheet_row(key="aqua-futures-standard-50k", firm_key="aquafutures", firm_name="Aqua Futures",
                        account_label="Standard", account_size_usd="50000", eval_cost_usd="1",
                        discount_code="SHEETCODE", discount_pct="25")
        result = build([row], {"aquafutures": fixture("aquafutures")}, NOW)
        self.assertEqual(result["review"], [])
        [patch] = result["patches"]
        self.assertEqual(patch["values"], {"eval_cost_usd": "999", "discount_code": "", "discount_pct": "11",
                                           "discounted_eval_usd": ""})
        self.assertEqual(patch["expected"]["discount_code"], "SHEETCODE")
        self.assertNotIn("promotionExpiresAt", patch)

    def test_build_holds_pricing_without_bulk_discount(self):
        row = sheet_row(key="aqua-futures-standard-50k", firm_key="aquafutures", firm_name="Aqua Futures",
                        account_label="Standard", account_size_usd="50000", eval_cost_usd="1",
                        discount_code="SHEETCODE", discount_pct="25")
        source = fixture("aquafutures").replace("bulkDiscount: { forex: 11, futures: 11 },", "")
        result = build([row], {"aquafutures": source}, NOW)
        self.assertEqual(result["patches"], [])
        self.assertEqual(result["review"][0]["proposed"], {"eval_cost_usd": "999"})

    def test_build_rejects_malformed_non_empty_code(self):
        row = sheet_row(key="aqua-futures-standard-50k", firm_key="aquafutures", firm_name="Aqua Futures",
                        account_label="Standard", account_size_usd="50000", eval_cost_usd="1", discount_code="")
        bad = lambda *_: ({"eval_cost_usd": "999", "discount_code": "BAD CODE"}, True, None, "x")
        with mock.patch.dict(collect.ADAPTERS, {"aquafutures": bad}):
            result = build([row], {"aquafutures": fixture("aquafutures")}, NOW)
        self.assertEqual(result["patches"], [])
        self.assertEqual(result["review"][0]["reason"], "Invalid public coupon")


class BluSkyAdapterTests(unittest.TestCase):
    def run_adapter(self, source=None, **values):
        defaults = dict(key="propel-50k", firm_key="blusky-trading", firm_name="BluSky Trading",
                        account_label="Propel 50K", account_size_usd="50000", eval_cost_usd="1",
                        discount_code="OLDCODE", discount_pct="10")
        return collect.blusky(source or fixture("blusky-trading"), sheet_row(**{**defaults, **values}), NOW)

    def test_sale_card_gives_regular_price_code_and_percentage(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        self.assertEqual(fields, {"activation_fee_usd": "0", "eval_cost_usd": "999", "discount_code": "TESTCODE",
                                  "discount_pct": "30", "discounted_eval_usd": ""})
        self.assertIn("price 699.3, was 999", evidence)
        fields, _, _, _ = self.run_adapter(discount_code="MAD")
        self.assertEqual(fields["discount_code"], "MAD")

    def test_plain_price_verified_only_when_sheet_has_no_discount(self):
        fields, verified, _, _ = self.run_adapter(key="orbit-50k", account_label="Orbit 50K",
                                                  discount_code="", discount_pct="")
        self.assertIs(verified, True)
        self.assertEqual(fields, {"activation_fee_usd": "0", "eval_cost_usd": "888"})
        fields, verified, _, _ = self.run_adapter(key="launch-50k", account_label="Launch 50K",
                                                  discount_code="", discount_pct="50")
        self.assertIs(verified, False)
        self.assertEqual(fields, {"activation_fee_usd": "77", "eval_cost_usd": "99"})
        fields, verified, _, _ = self.run_adapter(key="instant-direct-3-5k", account_label="Instant Funding 3.5K",
                                                  account_size_usd="3500", discount_code="", discount_pct="")
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "666")
        fields, _, _, _ = self.run_adapter(key="launch-200k-static", account_label="Launch 200K Static",
                                           account_size_usd="200000", discount_code="", discount_pct="")
        self.assertEqual(fields, {"activation_fee_usd": "111", "eval_cost_usd": "555"})

    def test_sale_without_code_holds_coupon(self):
        fields, verified, _, _ = self.run_adapter(account_label="Propel 200K Static", account_size_usd="200000")
        self.assertIs(verified, False)
        self.assertEqual(fields, {"activation_fee_usd": "0", "eval_cost_usd": "888"})

    def test_mismatches_and_odd_discounts_fail_closed(self):
        for label, size in (("Propel 100K", "100000"),          # 333 is not a whole % of 999
                            ("Launch 200K", "200000"),          # site plan is static
                            ("Launch 50K Static", "50000"),     # site plan is trailing
                            ("Orbit 300K", "300000"), ("Propel 50K", "100000"), ("Premium 50K", "50000")):
            with self.subTest(label=label, size=size), self.assertRaises((ValueError, KeyError)):
                self.run_adapter(account_label=label, account_size_usd=size)
        with self.assertRaises(ValueError):
            self.run_adapter(fixture("blusky-trading").replace("const skyData2", "const skyData"))
        nested = fixture("blusky-trading").replace('price: 99 })', 'price: 99, x: {a: 1} })')
        with self.assertRaises(ValueError):
            self.run_adapter(nested, account_label="Launch 50K")


class TakeProfitTraderAdapterTests(unittest.TestCase):
    def run_adapter(self, source=None, **values):
        defaults = dict(key="tpt-25k", firm_key="takeprofittrader", firm_name="Take Profit Trader",
                        account_label="Test", account_size_usd="25000", eval_cost_usd="1",
                        discount_code="OLDCODE", discount_pct="40")
        return collect.take_profit_trader(source or fixture("takeprofittrader"), sheet_row(**{**defaults, **values}), NOW)

    def test_api_price_and_banner_coupon(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        self.assertEqual(fields, {"eval_cost_usd": "999", "discount_code": "TESTCODE",
                                  "discount_pct": "25", "discounted_eval_usd": ""})
        self.assertIn("id 2", evidence)
        fields, _, _, _ = self.run_adapter(discount_code="MADPROPS")
        self.assertEqual(fields["discount_code"], "MADPROPS")

    def test_api_discount_price_or_unclear_banner_holds_coupon(self):
        fields, verified, _, _ = self.run_adapter(account_size_usd="50000")
        self.assertIs(verified, False)
        self.assertEqual(fields, {"eval_cost_usd": "888"})
        for banner in ("Get 25% Off! Use Code: TESTCODE or 30% Off", "Get 25% Off! Use Code: A or Use Code: B",
                       "Big sale today!"):
            source = fixture("takeprofittrader").replace(
                "Get 25% Off For Life + Fake Perk! <a href=\"https://example.invalid/faq\">DETAILS</a>. Use Code: TESTCODE",
                banner)
            with self.subTest(banner=banner):
                fields, verified, _, _ = self.run_adapter(source)
                self.assertIs(verified, False)
                self.assertEqual(fields, {"eval_cost_usd": "999"})

    def test_missing_duplicate_or_free_items_fail_closed(self):
        for label, size in (("Test", "75000"), ("Test", "100000"), ("Test", "150000"), ("PRO+", "25000")):
            with self.subTest(label=label, size=size), self.assertRaises(ValueError):
                self.run_adapter(account_label=label, account_size_usd=size)
        with self.assertRaises(ValueError):
            self.run_adapter("<html>banner only</html>")
        with self.assertRaises(ValueError):
            self.run_adapter(fixture("takeprofittrader").replace('"isSuccess":true', '"isSuccess":false'))

    def test_fetch_source_appends_api_json_as_inert_block(self):
        pages = {"https://takeprofittrader.com/": "<p>page</p>",
                 collect.COMPANION_JSON["takeprofittrader"]: '{"result":{"items":[]},"note":"</script>"}'}
        original = collect.fetch
        collect.fetch = lambda url, browser=False: pages[url]
        try:
            text = collect.fetch_source("takeprofittrader", "https://takeprofittrader.com/")
            self.assertEqual(collect.TPT_COMPANION.findall(text), ['{"result":{"items":[]},"note":"<\\/script>"}'])
            pages[collect.COMPANION_JSON["takeprofittrader"]] = "<html>not json</html>"
            with self.assertRaises(ValueError):
                collect.fetch_source("takeprofittrader", "https://takeprofittrader.com/")
        finally:
            collect.fetch = original


class TradersLaunchAdapterTests(unittest.TestCase):
    def run_adapter(self, source=None, **values):
        defaults = dict(key="traderslaunch-standard-80-100k", firm_key="traderslaunch", firm_name="Traders Launch",
                        account_label="Standard 80%", account_size_usd="100000", eval_cost_usd="1",
                        discount_code="", discount_pct="0")
        return collect.traders_launch(source or fixture("traderslaunch"), sheet_row(**{**defaults, **values}), NOW)

    # ── Standard / Premium card tests ────────────────────────────
    def test_standard_card_price_and_rules(self):
        fields, verified, expires, evidence = self.run_adapter()
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        # The Legacy NYC card for the same size and split ($111) is ignored.
        self.assertEqual(fields, {"eval_cost_usd": "999", "activation_fee_usd": "0",
                                  "min_days (Eval)": "3", "ddt": "EOD"})
        self.assertIn("one-time fee 999", evidence)
        fields, _, _, _ = self.run_adapter(account_label="Standard 60%", account_size_usd="300000")
        self.assertEqual((fields["eval_cost_usd"], fields["activation_fee_usd"]), ("666", "55"))

    def test_premium_label_accepted(self):
        """'Premium 80%' is an alias for 'Standard 80%'."""
        fields, verified, _, _ = self.run_adapter(account_label="Premium 80%")
        self.assertIs(verified, True)
        self.assertEqual(fields["eval_cost_usd"], "999")

    def test_sheet_discount_holds_pricing(self):
        fields, verified, _, _ = self.run_adapter(discount_code="OLDCODE", discount_pct="10")
        self.assertIs(verified, False)
        self.assertEqual(fields["eval_cost_usd"], "999")

    def test_unrendered_split_or_sale_fails_closed(self):
        for label, size in (("Standard 55%", "300000"), ("Standard 55%", "100000"),
                            ("Standard 80%", "300000"), ("Standard 80%", "200000")):
            with self.subTest(label=label, size=size), self.assertRaises(ValueError):
                self.run_adapter(account_label=label, account_size_usd=size)

    def test_unknown_label_fails_closed(self):
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Turbo 80%")

    # ── Legacy NYC card tests ────────────────────────────────────
    def test_legacy_nyc_card_price(self):
        fields, verified, expires, evidence = self.run_adapter(
            key="traderslaunch-nyc-80-100k", account_label="Legacy NYC 80%",
            account_size_usd="100000")
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        self.assertEqual(fields["eval_cost_usd"], "111")
        self.assertEqual(fields["ddt"], "EOD")
        self.assertEqual(fields["activation_fee_usd"], "0")
        self.assertIn("Legacy NYC", evidence)

    def test_legacy_nyc_200k(self):
        fields, _, _, _ = self.run_adapter(
            key="traderslaunch-nyc-80-200k", account_label="Legacy NYC 80%",
            account_size_usd="200000")
        self.assertEqual(fields["eval_cost_usd"], "222")

    def test_legacy_nyc_wrong_split_fails_closed(self):
        """NYC 300K in fixture has split=55, not 80 → fail closed."""
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Legacy NYC 80%", account_size_usd="300000")

    def test_legacy_nyc_discount_holds(self):
        _, verified, _, _ = self.run_adapter(
            account_label="Legacy NYC 80%", account_size_usd="100000",
            discount_code="CODE", discount_pct="5")
        self.assertIs(verified, False)

    # ── Static plan tests (companion JSON) ───────────────────────
    def test_static_plan_price(self):
        fields, verified, expires, evidence = self.run_adapter(
            key="traderslaunch-static-80-25k", account_label="Static 80%",
            account_size_usd="25000")
        self.assertIs(verified, True)
        self.assertIsNone(expires)
        self.assertEqual(fields["eval_cost_usd"], "555")
        self.assertEqual(fields["ddt"], "Static")
        self.assertEqual(fields["activation_fee_usd"], "0")
        self.assertIn("Static", evidence)
        self.assertIn("offers API", evidence)

    def test_static_multiple_sizes(self):
        """50K 80% and 100K 60% from the fixture companion JSON."""
        fields, _, _, _ = self.run_adapter(
            key="traderslaunch-static-80-50k", account_label="Static 80%",
            account_size_usd="50000")
        self.assertEqual(fields["eval_cost_usd"], "444")
        fields, _, _, _ = self.run_adapter(
            key="traderslaunch-static-60-100k", account_label="Static 60%",
            account_size_usd="100000")
        self.assertEqual(fields["eval_cost_usd"], "777")

    def test_static_90_split(self):
        fields, _, _, _ = self.run_adapter(
            key="traderslaunch-static-90-25k", account_label="Static 90%",
            account_size_usd="25000")
        self.assertEqual(fields["eval_cost_usd"], "333")

    def test_static_sold_out_fails_closed(self):
        """50K 60% is marked soldOut in fixture → fail closed."""
        with self.assertRaises(ValueError) as ctx:
            self.run_adapter(account_label="Static 60%", account_size_usd="50000")
        self.assertIn("sold out", str(ctx.exception))

    def test_static_missing_plan_fails_closed(self):
        """100K 90% has no entry in the fixture → fail closed."""
        with self.assertRaises(ValueError):
            self.run_adapter(account_label="Static 90%", account_size_usd="100000")

    def test_static_disabled_provider_ignored(self):
        """The disabled provider's 25K 80% plan must not match."""
        # Only the enabled hyperprop provider's $555 should match, not $1.
        fields, _, _, _ = self.run_adapter(
            account_label="Static 80%", account_size_usd="25000")
        self.assertEqual(fields["eval_cost_usd"], "555")

    def test_static_discount_holds(self):
        _, verified, _, _ = self.run_adapter(
            account_label="Static 80%", account_size_usd="25000",
            discount_code="OLD", discount_pct="10")
        self.assertIs(verified, False)

    def test_static_no_companion_fails_closed(self):
        """If companion JSON is missing, Static plans fail closed."""
        source_no_companion = fixture("traderslaunch").split('<script type="application/json"')[0] + "</body></html>"
        with self.assertRaises(ValueError) as ctx:
            self.run_adapter(source=source_no_companion, account_label="Static 80%",
                             account_size_usd="25000")
        self.assertIn("not found", str(ctx.exception))
