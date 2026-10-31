import unittest
from pricing_review import generate

class PricingReviewTests(unittest.TestCase):
    def test_changed_prices_and_sources_are_visible(self):
        report = generate({"generatedAt":"2026-11-01T00:00:00Z","patches":[{
            "key":"tradeify-select-100k",
            "expected":{"discount_code":"GEMS","discount_pct":"30"},
            "values":{"discount_code":"NOV","discount_pct":"30"},
            "source":"https://tradeify.co/",
            "promotionExpiresAt":"2026-11-30T23:59:00-05:00"
        }],"review":[]})
        for value in ("GEMS", "NOV", "tradeify-select-100k",
                      "2026-11-30T23:59:00-05:00", "https://tradeify.co/"):
            self.assertIn(value, report)
        self.assertIn("affiliate-specific", report)

    def test_unverified_items_stay_visible(self):
        report = generate({"patches":[],"review":[{"key":"tradeify-select-50k","reason":"Coupon not verified"}]})
        self.assertIn("Coupon not verified", report)

if __name__ == "__main__":
    unittest.main()
