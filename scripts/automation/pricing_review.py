"""Generate a readable pricing review from official-source collector patches.

This is a review aid only. It never approves or publishes a price.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROMO = ("discount_code", "discount_pct", "discounted_eval_usd")
FIELDS = ("eval_cost_usd", "discount_code", "discount_pct", "discounted_eval_usd", "activation_fee_usd")
LABELS = {
    "eval_cost_usd": "Regular price",
    "discount_code": "Promo code",
    "discount_pct": "Discount %",
    "discounted_eval_usd": "Discounted price",
    "activation_fee_usd": "Activation fee",
}

def generate(data):
    lines = ["# MadProps — Pricing approval review", "",
             "This report shows official-source proposals. **Review before merging**; no changes are automatically approved.", "",
             f"Collected: {data.get('generatedAt', 'unknown')}", ""]
    changed = []
    for patch in data.get("patches", []):
        delta = [(field, patch.get("expected", {}).get(field, ""), patch["values"][field])
                 for field in FIELDS if field in patch.get("values", {})
                 and patch.get("expected", {}).get(field, "") != patch["values"][field]]
        if delta:
            changed.append((patch, delta))
    lines += [f"**Plans with proposed changes:** {len(changed)}", "",
              "| Plan | Field | Existing Sheet | Official source | Promo expires | Evidence |",
              "|---|---|---|---|---|---|"]
    for patch, delta in changed:
        for field, old, new in delta:
            expires = patch.get("promotionExpiresAt", "—") if field in PROMO else "—"
            url = patch.get("source", "")
            evidence = f"[Official site]({url})" if url.startswith("https://") else "—"
            values = [patch.get("key", ""), LABELS.get(field, field), str(old) or "(blank)",
                      str(new) or "(blank)", expires, evidence]
            lines.append("| " + " | ".join(v.replace("|", "/").replace("\n", " ") for v in values) + " |")
    if not changed:
        lines.append("| No price differences detected | — | — | — | — | — |")
    lines += ["", "## Requires investigation", ""]
    reviews = data.get("review", [])
    if reviews:
        lines += [f"- **{item.get('key', '?')}**: {item.get('reason', 'Review needed')}" for item in reviews]
    else:
        lines.append("No additional review items reported.")
    lines += ["", "## Approval safeguards", "",
              "- Verify new promo codes at the official checkout before approving.",
              "- Do not replace an affiliate-specific code with a generic public code.",
              "- Never assume a monthly discount continues without official evidence.",
              "- An expired promotion must not become a permanent baseline.", ""]
    return "\n".join(lines)

if __name__ == "__main__":
    data = json.loads((ROOT / "data/firm-updates.json").read_text())
    output = ROOT / "data/pricing-review.md"
    output.write_text(generate(data))
    print(f"Prepared {output}")
