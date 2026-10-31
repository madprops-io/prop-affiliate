"""Validate data/approved-firm-data.json before a human merges an approval PR.

Hard errors (exit 1) mean the file would be silently ignored or misapplied by
lib/approvedUpdates.ts, or contains values that can never be correct.
Warnings flag changes a reviewer should look at twice (large price moves,
coupon-code changes); they never fail the check.
"""
import argparse
from datetime import datetime
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
PERMITTED = {"eval_cost_usd", "activation_fee_usd", "discount_code",
             "discount_pct", "discounted_eval_usd", "min_days (Eval)", "ddt"}
PROMO = {"discount_code", "discount_pct", "discounted_eval_usd"}
MONEY = re.compile(r"\d+(?:\.\d{1,2})?")
CODE = re.compile(r"[A-Za-z0-9_-]{1,40}")
# Markers used only by synthetic test fixtures; must never reach live data.
SYNTHETIC = re.compile(r"SYNTHETIC|TESTCODE|FAKECODE", re.I)
LARGE_MOVE = 0.5


def parse_time(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else None


def validate(current, base=None):
    errors, warnings = [], []
    if not isinstance(current, dict) or current.get("schemaVersion") != 1:
        return ["schemaVersion must be 1 (the app ignores the whole file otherwise)"], warnings
    entries = current.get("entries")
    if not isinstance(entries, list):
        return ["entries must be a list"], warnings
    base_entries = {e.get("key"): e for e in (base or {}).get("entries", []) if isinstance(e, dict)}
    seen = set()
    for index, entry in enumerate(entries):
        where = f"entries[{index}]"
        if not isinstance(entry, dict):
            errors.append(f"{where}: not an object")
            continue
        key = entry.get("key")
        if not isinstance(key, str) or not key.strip():
            errors.append(f"{where}: missing key")
            continue
        where = key
        if key in seen:
            errors.append(f"{where}: duplicate key (the app ignores duplicated entries)")
        seen.add(key)
        if parse_time(entry.get("approvedAt")) is None:
            errors.append(f"{where}: approvedAt is not a timezone-aware ISO timestamp")
        values = entry.get("values")
        if not isinstance(values, dict) or not values:
            errors.append(f"{where}: values must be a non-empty object")
            continue
        for field, value in values.items():
            if field not in PERMITTED:
                errors.append(f"{where}: field {field!r} is not permitted")
            elif not isinstance(value, str):
                errors.append(f"{where}: {field} must be a string")
            elif SYNTHETIC.search(value):
                errors.append(f"{where}: {field} contains a synthetic test-fixture value")
            elif field == "discount_code":
                if value and not CODE.fullmatch(value):
                    errors.append(f"{where}: invalid discount_code {value!r}")
            elif field == "ddt":
                continue
            elif field == "discounted_eval_usd" and value == "":
                continue
            elif not MONEY.fullmatch(value) or float(value) > 100_000:
                errors.append(f"{where}: {field} is not a dollar/number value: {value!r}")
        pct = values.get("discount_pct")
        if isinstance(pct, str) and MONEY.fullmatch(pct) and float(pct) > 100:
            errors.append(f"{where}: discount_pct above 100")
        cost, disc = values.get("eval_cost_usd"), values.get("discounted_eval_usd")
        if all(isinstance(v, str) and MONEY.fullmatch(v) for v in (cost, disc)) and float(disc) > float(cost):
            errors.append(f"{where}: discounted price {disc} exceeds regular price {cost}")
        if PROMO & set(values):
            if parse_time(entry.get("promotionExpiresAt")) is None:
                errors.append(f"{where}: promotion fields require a timezone-aware promotionExpiresAt")
        prior = base_entries.get(key, {}).get("values", {})
        for field in ("eval_cost_usd", "discounted_eval_usd", "activation_fee_usd"):
            old, new = prior.get(field), values.get(field)
            if (isinstance(old, str) and isinstance(new, str) and MONEY.fullmatch(old)
                    and MONEY.fullmatch(new) and float(old) > 0
                    and abs(float(new) - float(old)) / float(old) > LARGE_MOVE):
                warnings.append(f"{where}: {field} moved more than 50% ({old} -> {new})")
        old_code, new_code = prior.get("discount_code"), values.get("discount_code")
        if old_code and new_code and old_code.upper() != new_code.upper():
            warnings.append(f"{where}: discount_code changes {old_code} -> {new_code}; confirm it is not an affiliate code")
    return errors, warnings


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", type=Path, default=ROOT / "data/approved-firm-data.json")
    parser.add_argument("--base", type=Path, help="Same file from the target branch, for change warnings")
    args = parser.parse_args(argv)
    try:
        current = json.loads(args.current.read_text())
    except (OSError, ValueError) as exc:
        print(f"ERROR: cannot read {args.current}: {exc}")
        return 1
    base = None
    if args.base and args.base.exists():
        try:
            base = json.loads(args.base.read_text())
        except ValueError:
            print("WARNING: base file is not valid JSON; change warnings skipped")
    errors, warnings = validate(current, base)
    for message in warnings:
        print(f"WARNING: {message}")
    for message in errors:
        print(f"ERROR: {message}")
    print(f"{len(current.get('entries', [])) if isinstance(current, dict) else 0} entries, "
          f"{len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
