import unittest
from source_candidates import extract, match_sheet_rows

class CandidateEvidenceTests(unittest.TestCase):
    def test_size_matching_is_review_only(self):
        rows=[{"firm_key":"tradeday","key":"td-50","account_label":"EOD 50K","account_size_usd":"50000"},
              {"firm_key":"bulenox","key":"bx-50","account_label":"50K","account_size_usd":"50000"}]
        evidence={"candidateLines":["50K evaluation plan $99","150K plan $199","50K activation fee $30"]}
        found=match_sheet_rows("tradeday",evidence,rows)
        self.assertEqual(len(found),1)
        self.assertEqual(len(found[0]["candidateLines"]),2)
        self.assertEqual(found[0]["status"],"REQUIRES_EXACT_PLAN_VERIFICATION")
        self.assertNotIn("eval_cost_usd",found[0])
    def test_scripts_and_ambiguous_prices_not_extracted(self):
        found=extract('<script>const price="$99";</script><p>50K account $150</p>')
        self.assertEqual(found["candidateLines"],["50K account $150"])
    def test_unmatched_size_does_not_fabricate_price(self):
        found=match_sheet_rows("bulenox",{"candidateLines":["100K $99"]},
                               [{"firm_key":"bulenox","key":"bx-50","account_size_usd":"50000"}])
        self.assertEqual(found[0]["candidateLines"],[])

if __name__=="__main__":
    unittest.main()
