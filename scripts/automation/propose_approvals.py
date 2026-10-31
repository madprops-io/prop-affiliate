"""Generate reviewable pricing proposals; never approve an undated promotion."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
live = json.loads((ROOT / "data/firm-updates.json").read_text())
path = ROOT / "data/approved-firm-data.json"
approved = json.loads(path.read_text())
entries = {entry["key"]: entry for entry in approved["entries"]}
promo = {"discount_code", "discount_pct", "discounted_eval_usd"}
now = datetime.now(timezone.utc)

for patch in live["patches"]:
    changed = {
        k: v for k, v in patch["values"].items()
        if patch["expected"].get(k, "") != v
    }
    if not changed:
        continue
    expiry = patch.get("promotionExpiresAt")
    if promo.intersection(changed):
        # Do not persist promotions without a documented, future source expiry.
        try:
            expires = datetime.fromisoformat(expiry.replace("Z", "+00:00")) if expiry else None
        except ValueError:
            expires = None
        if expires is None or expires.tzinfo is None or expires <= now:
            changed = {k: v for k, v in changed.items() if k not in promo}
    if not changed:
        continue
    key = patch["key"]
    prior = entries.get(key, {})
    values = dict(prior.get("values", {}))
    values.update(changed)
    proposal = {"key": key, "values": values, "approvedAt": patch["verifiedAt"]}
    if promo.intersection(values):
        # Preserve an earlier approved promotion's original expiry.
        proposal["promotionExpiresAt"] = (
            expiry if promo.intersection(changed)
            else prior.get("promotionExpiresAt")
        )
        if not proposal["promotionExpiresAt"]:
            values = {k: v for k, v in values.items() if k not in promo}
            proposal.pop("promotionExpiresAt")
    if prior.get("values") == values and prior.get("promotionExpiresAt") == proposal.get("promotionExpiresAt"):
        continue
    entries[key] = proposal

approved["entries"] = [entries[key] for key in sorted(entries)]
path.write_text(json.dumps(approved, indent=2) + "\n")
