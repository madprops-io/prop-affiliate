import copy
import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

import publish_decision
from publish_decision import DEFAULT_MIN_REMAINING_HOURS, decide, min_remaining_hours

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/update-firms.yml"
# Real committed snapshot structure (read-only; tests never write to the repo file).
REAL = json.loads((ROOT / "data/firm-updates.json").read_text())
HORIZON = DEFAULT_MIN_REMAINING_HOURS


def iso(dt):
    return dt.isoformat()


def committed():
    """Real snapshot with every patch on the ordinary 18h expiry (no imminent promo end)."""
    snap = copy.deepcopy(REAL)
    for patch in snap["patches"]:
        patch["expiresAt"] = iso(datetime.fromisoformat(patch["verifiedAt"]) + timedelta(hours=18))
    return snap


def rerun(snap, hours=1.0):
    """The same material content as a later collector run would write it."""
    later = copy.deepcopy(snap)
    shift = timedelta(hours=hours)
    later["generatedAt"] = iso(datetime.fromisoformat(snap["generatedAt"]) + shift)
    for patch in later["patches"]:
        patch["verifiedAt"] = iso(datetime.fromisoformat(patch["verifiedAt"]) + shift)
        patch["expiresAt"] = iso(datetime.fromisoformat(patch["expiresAt"]) + shift)
    return later


def run_at(snap, hours=1.0):
    return datetime.fromisoformat(snap["generatedAt"]) + timedelta(hours=hours)


def check(prev, cur, hours=1.0):
    return decide(json.dumps(prev), json.dumps(cur), run_at(prev, hours), HORIZON)


class PublishDecisionTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(REAL["patches"], "committed snapshot should contain patches")
        self.prev = committed()
        self.cur = rerun(self.prev)

    def test_timestamp_only_refresh_is_skipped(self):
        decision, reason = check(self.prev, self.cur)
        self.assertEqual(decision, "skip", reason)

    def test_sha256_and_page_byte_counts_are_not_material(self):
        for patch in self.cur["patches"]:
            patch["sha256"] = "0" * 64
        for diag in self.cur["sourceDiagnostics"].values():
            if "bytes" in diag:
                diag["bytes"] += 17
        self.assertEqual(check(self.prev, self.cur)[0], "skip")

    def test_price_value_change_publishes(self):
        self.cur["patches"][0]["values"]["eval_cost_usd"] = "1"
        self.assertEqual(check(self.prev, self.cur)[0], "publish")

    def test_expected_guard_change_publishes(self):
        self.cur["patches"][0]["expected"]["discount_code"] = "OTHER"
        self.assertEqual(check(self.prev, self.cur)[0], "publish")

    def test_coupon_or_promotion_expiry_change_publishes(self):
        promo = next(p for p in self.cur["patches"] if "promotionExpiresAt" in p)
        promo["promotionExpiresAt"] = "2099-01-01T00:00:00+00:00"
        self.assertEqual(check(self.prev, self.cur)[0], "publish")
        cur = rerun(self.prev)
        cur["patches"][0]["values"]["discount_code"] = "CHANGED"
        self.assertEqual(check(self.prev, cur)[0], "publish")

    def test_patch_added_or_removed_publishes(self):
        removed = rerun(self.prev)
        removed["patches"].pop()
        self.assertEqual(check(self.prev, removed)[0], "publish")
        added = rerun(self.prev)
        extra = copy.deepcopy(added["patches"][0])
        extra["key"] = "synthetic-new-plan"
        added["patches"].append(extra)
        self.assertEqual(check(self.prev, added)[0], "publish")

    def test_patch_order_alone_is_not_material(self):
        self.cur["patches"].reverse()
        self.assertEqual(check(self.prev, self.cur)[0], "skip")

    def test_review_coverage_and_reachability_changes_publish(self):
        for mutate in (
            lambda s: s["review"].append({"key": "synthetic", "reason": "test"}),
            lambda s: s["coverage"].update({"synthetic": 1}),
            lambda s: s["unsupportedFirms"].update({"synthetic": 1}),
            lambda s: s["sourceDiagnostics"].update({"tradeday": {"error": "HTTPError: HTTP Error 403: Forbidden"}}),
        ):
            cur = rerun(self.prev)
            mutate(cur)
            self.assertEqual(check(self.prev, cur)[0], "publish")

    def test_ageing_committed_data_is_refreshed_before_ttl(self):
        # Patches lapse 18h after verifiedAt; with a 12h horizon a run 6h+ later republishes.
        self.assertEqual(check(self.prev, rerun(self.prev, 5.9), hours=5.9)[0], "skip")
        decision, reason = check(self.prev, rerun(self.prev, 6.1), hours=6.1)
        self.assertEqual(decision, "publish")
        self.assertIn("lapses", reason)

    def test_fixed_source_expiry_does_not_force_identical_republish(self):
        # Republishing cannot extend a promotion-end expiry; the post-expiry run differs materially.
        promo = next(p for p in self.prev["patches"] if "promotionExpiresAt" in p)
        promo["expiresAt"] = iso(run_at(self.prev) + timedelta(hours=3))
        cur = rerun(self.prev)
        next(p for p in cur["patches"] if p["key"] == promo["key"])["expiresAt"] = promo["expiresAt"]
        self.assertEqual(check(self.prev, cur)[0], "skip")

    def test_real_snapshot_rerun_is_skipped_but_ages_into_publish(self):
        self.assertEqual(check(REAL, rerun(REAL))[0], "skip")
        self.assertEqual(check(REAL, rerun(REAL, 7), hours=7)[0], "publish")

    def test_snapshot_without_patches_still_refreshes_status_before_stale(self):
        prev = committed()
        prev["patches"] = []
        cur = rerun(prev, 7)
        self.assertEqual(check(prev, rerun(prev, 1))[0], "skip")
        self.assertEqual(check(prev, cur, hours=7)[0], "publish")

    def test_missing_corrupt_or_schema_changed_previous_publishes(self):
        now = run_at(self.prev)
        cur = json.dumps(self.cur)
        self.assertEqual(decide(None, cur, now, HORIZON)[0], "publish")
        self.assertEqual(decide("", cur, now, HORIZON)[0], "publish")
        self.assertEqual(decide("{not json", cur, now, HORIZON)[0], "publish")
        self.assertEqual(decide("[]", cur, now, HORIZON)[0], "publish")
        self.assertEqual(decide(json.dumps(self.prev), "{not json", now, HORIZON)[0], "publish")
        schema = rerun(self.prev)
        schema["schemaVersion"] = 2
        self.assertEqual(check(self.prev, schema)[0], "publish")

    def test_unparseable_committed_timestamps_publish(self):
        self.prev["patches"][0]["verifiedAt"] = "not-a-date"
        cur = rerun(committed())
        cur["patches"][0]["verifiedAt"] = "also-bad"
        self.assertEqual(check(self.prev, cur)[0], "publish")

    def test_invalid_horizon_falls_back_to_default(self):
        for raw in (None, "", "abc", "0", "-1", "18", "24"):
            self.assertEqual(min_remaining_hours(raw), DEFAULT_MIN_REMAINING_HOURS, raw)
        self.assertEqual(min_remaining_hours("8"), 8.0)

    def test_cli_writes_github_output_and_summary(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            prev, cur = tmp / "prev.json", tmp / "cur.json"
            prev.write_text(json.dumps(self.prev))
            cur.write_text(json.dumps(self.cur))
            out, summary = tmp / "out", tmp / "summary"
            with mock.patch.dict(os.environ, {"GITHUB_OUTPUT": str(out), "GITHUB_STEP_SUMMARY": str(summary)}):
                code = publish_decision.main(["--previous", str(prev), "--current", str(cur), "--now", iso(run_at(self.prev))])
                self.assertEqual(code, 0)
                self.assertIn("decision=skip\n", out.read_text())
                self.assertIn("Publish decision:** skip", summary.read_text())
                publish_decision.main(["--previous", str(tmp / "missing.json"), "--current", str(cur)])
                self.assertIn("decision=publish\n", out.read_text())
                publish_decision.main(["--previous", str(prev), "--current", str(cur), "--now", "garbage"])
                self.assertTrue(out.read_text().rstrip().splitlines()[-2] == "decision=publish")


class WorkflowWiringTests(unittest.TestCase):
    def test_publish_step_decides_before_commit_and_keeps_retry(self):
        text = WORKFLOW.read_text()
        step = text[text.index("- name: Publish verified updates"):text.index("- name: Prepare human approval proposal")]
        self.assertLess(step.index("publish_decision.py"), step.index("git commit"))
        self.assertIn("git checkout -- data/firm-updates.json", step)
        self.assertIn("for attempt in 1 2 3 4", step)
        self.assertIn("git rebase -X theirs origin/main", step)


if __name__ == "__main__":
    unittest.main()
