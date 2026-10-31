"""Propose durable approved values from currently verified patches.

Writes ONLY a reviewable file; merging the generated pull request is approval.
Temporary promotions retain their source expiration and cannot become perpetual.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
live = json.loads((ROOT / "data/firm-updates.json").read_text())
path = ROOT / "data/approved-firm-data.json"
approved = json.loads(path.read_text())
entries = {e["key"]: e for e in approved["entries"]}
promo = {"discount_code", "discount_pct", "discounted_eval_usd"}
for patch in live["patches"]:
    changed = {k: v for k, v in patch["values"].items()
               if patch["expected"].get(k, "") != v}
    if not changed:
        continue
    key = patch["key"]
    prior = entries.get(key, {})
    values = dict(prior.get("values", {}))
    values.update(changed)
    proposal = {
        "key": key,
        "values": values,
        "approvedAt": patch["verifiedAt"],
    }
    if promo.intersection(values):
        # Do not approve a promo without a verifiable expiration.
        expiry = patch.get("promotionExpiresAt")
        # Collector's expiresAt is a conservative upper bound, never extend it.
        if not expiry:
            expiry = patch["expiresAt"]
        proposal["promotionExpiresAt"] = expiry
    if prior.get("values") == values and prior.get("promotionExpiresAt") == proposal.get("promotionExpiresAt"):\n        continue\n    entries[key] = proposal
approved["entries"] = [entries[key] for key in sorted(entries)]
path.write_text(json.dumps(approved, indent=2) + "\n")
