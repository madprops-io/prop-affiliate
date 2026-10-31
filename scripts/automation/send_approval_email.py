"""Send a review-required notification for a newly created or updated approval PR.

No email is sent for unchanged runs. Never approve or merge pricing automatically.
"""
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

def payload_from_env(env):
    key = env.get("RESEND_API_KEY", "").strip()
    sender = env.get("RESEND_FROM_EMAIL", "").strip()
    recipient = env.get("APPROVAL_TO_EMAIL", "").strip()
    url = env.get("APPROVAL_PR_URL", "").strip()
    operation = env.get("APPROVAL_PR_OPERATION", "").strip()
    if not key or not sender or not recipient:
        raise ValueError("Set RESEND_API_KEY secret and RESEND_FROM_EMAIL variable before approval emails can be sent")
    if operation not in ("created", "updated"):
        raise ValueError("No new pricing approval changes; notification skipped")
    if not url.startswith("https://github.com/madprops-io/prop-affiliate/pull/"):
        raise ValueError("Approval PR URL is missing or unexpected")
    action = "New" if operation == "created" else "Updated"
    return key, {
        "from": sender,
        "to": [recipient],
        "subject": f"[MadProps] {action} pricing changes need your approval",
        "text": (
            f"{action} verified pricing changes are ready for review.\n\n"
            f"Review the proposed changes and official source evidence here:\n{url}\n\n"
            "Only merge the pull request after checking prices, coupon codes and "
            "promotion expiration dates. This email does not approve or deploy changes.\n"
        ),
    }

def main():
    try:
        key, payload = payload_from_env(os.environ)
        request = Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                     "User-Agent": "MadProps-Approval-Notifier/1.0", "Accept": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=20) as response:
            result = json.load(response)
        if not result.get("id"):
            raise RuntimeError("Resend did not confirm a message ID")
        print("Resend accepted the pricing approval email.")
    except (ValueError, HTTPError, URLError, RuntimeError) as exc:
        print(f"Approval email failed: {exc}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
