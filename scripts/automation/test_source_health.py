import unittest
from source_health import render

class SourceHealthTests(unittest.TestCase):
    def test_blocked_source_is_not_claimed_verified(self):
        report = render({
            "generatedAt": "2026-10-31T00:00:00Z",
            "patches": [{"key": "tradeify-growth-50k"}],
            "review": [{"key": "apex-eod-50k", "reason": "Source blocked"}],
            "coverage": {"apex": 16, "tradeify": 12},
            "sourceDiagnostics": {"apex": {"error": "HTTP Error 403"}, "tradeify": {"bytes": 123}},
            "unsupportedFirms": {"bulenox": 24}
        })
        self.assertIn("BLOCKED / ERROR: HTTP Error 403", report)
        self.assertIn("| apex | 0 |", report)
        self.assertIn("| tradeify | 1 | Fetched |", report)
        self.assertIn("bulenox: 24", report)
        self.assertIn("does **not** confirm all firms are current", report)

if __name__ == "__main__":
    unittest.main()
