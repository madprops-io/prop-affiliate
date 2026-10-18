import unittest
from datetime import datetime, timezone

from collect import build, daytraders, literal, money, unique


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


if __name__ == '__main__':
    unittest.main()
