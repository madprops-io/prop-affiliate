import unittest
from send_approval_email import payload_from_env

class ApprovalEmailTests(unittest.TestCase):
    def setUp(self):
        self.env = {
            "RESEND_API_KEY": "test-key",
            "RESEND_FROM_EMAIL": "MadProps <notifications@example.com>",
            "APPROVAL_TO_EMAIL": "caldwell.tj@gmail.com",
            "APPROVAL_PR_URL": "https://github.com/madprops-io/prop-affiliate/pull/4",
            "APPROVAL_PR_OPERATION": "created",
        }

    def test_email_requires_review(self):
        key, data = payload_from_env(self.env)
        self.assertEqual(key, "test-key")
        self.assertEqual(data["to"], ["caldwell.tj@gmail.com"])
        self.assertIn("need your approval", data["subject"])
        self.assertIn("/pull/4", data["text"])

    def test_rejects_missing_credentials(self):
        env = dict(self.env, RESEND_API_KEY="")
        with self.assertRaises(ValueError):
            payload_from_env(env)

    def test_rejects_unexpected_url_and_noop(self):
        for overrides in (
            {"APPROVAL_PR_URL": "https://example.com"},
            {"APPROVAL_PR_OPERATION": "none"},
        ):
            with self.assertRaises(ValueError):
                payload_from_env(dict(self.env, **overrides))

if __name__ == "__main__":
    unittest.main()
