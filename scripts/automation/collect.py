"""Read official product data without executing remote JavaScript.

The Sheet remains the baseline. Output contains expiring, guarded cell patches,
not a replacement database. Unsupported plans and unverified coupons go to review.
"""
import argparse
import concurrent.futures
import csv
from datetime import datetime, timedelta, timezone
import hashlib
import html
import io
import json
import math
import os
from pathlib import Path
import re
import urllib.request
from zoneinfo import ZoneInfo

import json5

ROOT = Path(__file__).resolve().parents[2]
SHEET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0GR5dCkHlqXX3PQok8Ppu32Kz9U3hanQBFCEQ_j5rCq419Z7hBlW_foQN_QOo6d6oKcPU_KvVxZ0v/pub?output=csv"
SOURCES = {
    "apex": "https://apextraderfunding.com/",
    "tradeify": "https://tradeify.co/",
    "daytraders": "https://daytraders.com/go/madprops?i=1",
    "lucid": "https://lucidtrading.com/",
}
PRICE_FIELDS = {"eval_cost_usd", "discount_pct", "discounted_eval_usd", "discount_code"}
ALLOWED = PRICE_FIELDS | {"activation_fee_usd", "min_days (Eval)", "ddt"}
LITERALS = {}
# These are generic public sale codes, not MadProps affiliate identifiers.
# Unknown/custom codes are never replaced by the public storefront coupon.
PUBLIC_SALE_CODES = {"apex": {"SAVENOW"}, "tradeify": {"SEP", "GEMS"}}


def fetch(url):
    request = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; MadPropsDataMonitor/1.0; +https://madprops.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(request, timeout=40) as response:
        content = response.read(5_000_001)
        if len(content) > 5_000_000:
            raise ValueError("Source exceeds 5 MB limit")
        return content.decode("utf-8-sig")


def literal(text, marker, replacements=None):
    """Read one balanced literal, respecting strings and JS comments. Never eval."""
    cache_key = (text, marker, tuple(sorted((replacements or {}).items())))
    if cache_key in LITERALS:
        return LITERALS[cache_key]
    matches = list(re.finditer(marker, text))
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one data block: {marker}")
    start = matches[0].end()
    stack, quote, escaped, comment = [], None, False, None
    i = start
    while i < len(text):
        char, pair = text[i], text[i:i + 2]
        if comment == "line":
            if char == "\n":
                comment = None
        elif comment == "block":
            if pair == "*/":
                comment = None
                i += 1
        elif quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif pair in ("//", "/*"):
            comment = "line" if pair == "//" else "block"
            i += 1
        elif char in ("'", '"'):
            quote = char
        elif char in "[{":
            stack.append(char)
        elif char in "]}":
            if not stack or stack.pop() != ("]" == char and "[" or "{"):
                raise ValueError("Unbalanced data block")
            if not stack:
                raw = text[start:i + 1]
                for key, value in (replacements or {}).items():
                    raw = re.sub(r"\b" + re.escape(key) + r"\b", value, raw)
                parsed = json5.loads(raw, allow_duplicate_keys=False)
                LITERALS[cache_key] = parsed
                return parsed
        i += 1
    raise ValueError("Unterminated data block")


def money(value):
    if isinstance(value, bool) or value is None:
        raise ValueError("Missing numeric value")
    raw = str(value).strip().replace("$", "").replace(",", "")
    if not re.fullmatch(r"\d+(?:\.\d{1,2})?", raw):
        raise ValueError(f"Not a dollar amount: {value}")
    amount = float(raw)
    if amount > 100_000:
        raise ValueError("Dollar amount out of range")
    return format(amount, ".2f").rstrip("0").rstrip(".")


def unique(items):
    if not items:
        raise ValueError("No matching product")
    if any(item != items[0] for item in items[1:]):
        raise ValueError("Platforms or variants disagree; select a specific product")
    return items[0]


def apex(text, row, now):
    products = literal(text, r"\bproducts:\s*(?=\[)")
    label = row["account_label"].lower()
    if not re.fullmatch(r"(?:intraday|eod) (?:standard|no activation fee)", label):
        raise ValueError("Unknown Apex plan label")
    trail = "EndOfDay" if label.startswith("eod") else "RealTime"
    free = "no activation" in label
    matches = [p for p in products if p.get("category") == "eval" and p.get("enabled") is True
               and p.get("is_visible") is True and not p.get("isBundle")
               and p.get("pack_quantity") == 1 and p.get("balance") == int(row["account_size_usd"])
               and p.get("trail_type") == trail and p.get("free_activation") is free]
    base = unique([money(p["price"]) for p in matches])
    fields = {"eval_cost_usd": base}
    if free:
        fields["activation_fee_usd"] = "0"
    else:
        # PA price is not assumed to be a one-time activation charge.
        fees = [p.get("pa_features", {}).get("activation_fee") for p in matches]
        if fees and all(v is not None for v in fees):
            fields["activation_fee_usd"] = unique([money(v) for v in fees])
    promo = literal(text, r"\bpromoData:\s*")
    promo = promo.get(trail, promo)
    expires = datetime.strptime(promo["expiration"], "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo("America/New_York"))
    code = re.search(r'COUPON\s+"([A-Za-z0-9_-]+)"', promo.get("title_code", ""))
    verified = promo.get("active") is True and expires > now and code and (code[1].casefold() == row["discount_code"].casefold() or row["discount_code"].upper() in PUBLIC_SALE_CODES["apex"])
    if verified:
        fields["discount_code"] = code[1]
        fields["discount_pct"] = money(promo["first_month_code"])
        fields["discounted_eval_usd"] = ""
    return fields, bool(verified), expires if verified else now + timedelta(hours=18), f"Apex {trail}, {row['account_size_usd']}, free_activation={free}"


def tradeify(text, row, now):
    label = row["account_label"]
    if label not in ("Growth", "Select", "Lightning"):
        raise ValueError("Unknown Tradeify plan label")
    flags = dict(re.findall(r"const\s+(is\w+visible)\s*=\s*(true|false)\s*;", text))
    groups = literal(text, r"const\s+" + label + r"Data\s*=\s*", flags)
    matches = [a for group in groups for broker in group["broker"] for a in broker["account_size"]
               if group.get("isVisible") is True and broker.get("isVisible") is True
               and a.get("isVisible") is True and a["name"].lower() == str(int(row["account_size_usd"]) // 1000) + "k"]
    base = unique([money(p["price"]) for p in matches])
    fields = {"eval_cost_usd": base}
    activation = [next((r[1] for r in p["evaluation"] if r[0] == "Activation Fee"), None) for p in matches]
    if activation and all(a == "None" for a in activation):
        fields["activation_fee_usd"] = "0"
    coupon = literal(text, r"const\s+couponDetails\s*=\s*")[label.lower()]
    info = literal(text, r"const\s+couponInfo\s*=\s*")
    month = datetime.strptime(info["month"], "%B").month
    expires = datetime(now.year, month, int(info["lastDay"]), 23, 59, tzinfo=ZoneInfo("America/New_York"))
    verified = (coupon[0].casefold() == row["discount_code"].casefold() or row["discount_code"].upper() in PUBLIC_SALE_CODES["tradeify"]) and expires > now
    if verified:
        fields["discount_code"] = coupon[0]
        fields["discount_pct"] = money(coupon[1])
        exact = round(float(base) * (1 - float(coupon[1]) / 100), 2)
        displayed = unique([str(math.floor(exact + .5)) if not p.get("showFraction") else money(exact) for p in matches])
        # Website deliberately rounds prices; preserve exact override only when needed.
        fields["discounted_eval_usd"] = displayed if abs(float(displayed) - exact) >= .005 else ""
    return fields, verified, expires if verified else now + timedelta(hours=18), f"Tradeify {label}, {row['account_size_usd']}, all visible brokers agree"


def daytraders(text, row, now):
    data = literal(text, r"const\s+PS_DATA\s*=\s*")
    label = row["account_label"]
    group = "Trailing" if label.startswith("Trail ") else label.split()[0]
    size = str(int(row["account_size_usd"]) // 1000) + "K"
    matches = [p for p in data[group]["sizes"].values() if p.get("capital") == int(row["account_size_usd"])]
    p = unique(matches)
    # Mapping includes the group and capital; never match on account size alone.
    fields = {"eval_cost_usd": money(p["price"])}
    if p.get("activationFee") is not None:
        fields["activation_fee_usd"] = money(p["activationFee"])
    rules = {r["label"]: r["value"] for r in p.get("list", [])}
    minimum = re.fullmatch(r"(\d+) Qualifying Days", rules.get("Min. Days to Pass", ""))
    if minimum:
        fields["min_days (Eval)"] = minimum[1]
    verified = not row["discount_code"] and row["discount_pct"] in ("", "0") and not row["discounted_eval_usd"]
    return fields, verified, now + timedelta(hours=18), f"DayTraders {group} {size}, single-account price"


def lucid(text, row, now):
    data = literal(text, r"var\s+LucidPricingConfig\s*=\s*")
    identity = row["firm_key"]
    m = re.fullmatch(r"lucid-(pro|flex|daily|direct)-(25|50|100|150)k", identity)
    if not m:
        raise ValueError("Unknown Lucid plan identity")
    plan = unique([p for p in data["plans"]["planTypes"] if p["id"] == m[1] and p["enabled"]])
    fee = unique([f for f in plan["front"] if f["id"] == "one_time_fee"])
    if fee["kind"] != "headlinePrice":
        raise ValueError("Lucid price has selectable variants; needs an explicit variant mapping")
    product = fee["composedCells"]["s" + m[2] + "k"]
    fields = {"eval_cost_usd": money(data["productPrices"][product])}
    dd = next((f for f in plan["front"] if f["id"] == "drawdown_type"), None)
    if dd and dd["cells"].get("s" + m[2] + "k") == "EOD":
        fields["ddt"] = "EOD"
    # No evidence that the anonymous storefront discount applies to MAD.
    return fields, False, now + timedelta(hours=18), f"Lucid {m[1]} {m[2]}K, product {product}"


ADAPTERS = {"apex": apex, "tradeify": tradeify, "daytraders": daytraders, "lucid": lucid}


def row_identity(row):
    # The existing Sheet reverses key and firm_key for Lucid rows.
    firm_key = row.get("firm_key", "")
    return firm_key if firm_key.startswith("lucid-") else row.get("key") or firm_key


def build(rows, sources, now):
    patches, review, coverage = [], [], {}
    counts = {}
    for row in rows:
        identity = row_identity(row)
        if identity:
            counts[identity] = counts.get(identity, 0) + 1
    for row in rows:
        key = row_identity(row)
        if not key or not row.get("firm_name"):
            continue
        firm = "lucid" if row["firm_key"].startswith("lucid-") else row["firm_key"]
        coverage[firm] = coverage.get(firm, 0) + 1
        if firm not in ADAPTERS:
            continue
        try:
            if counts[key] != 1:
                raise ValueError("Duplicate row identity")
            if row.get("automation_hold", "").strip().lower() in ("yes", "true", "1"):
                raise ValueError("Automation held by Sheet automation_hold column")
            source = sources.get(firm)
            if not isinstance(source, str):
                raise ValueError("Official source unavailable: " + str(source))
            fields, verified_coupon, expires, evidence = ADAPTERS[firm](source, row, now)
            if not verified_coupon:
                proposed = {k: v for k, v in fields.items() if k in PRICE_FIELDS}
                review.append({"key": key, "reason": "Coupon not verified for existing Sheet code; pricing held", "proposed": proposed})
                fields = {k: v for k, v in fields.items() if k not in PRICE_FIELDS}
            for field, value in fields.items():
                if field not in ALLOWED:
                    raise ValueError("Unexpected output field")
                if field == "discount_code":
                    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", value):
                        raise ValueError("Invalid public coupon")
                elif field not in ("ddt", "discounted_eval_usd") or value:
                    if field != "ddt":
                        money(value)
                if field == "discount_pct" and float(value) > 100:
                    raise ValueError("Invalid discount percentage")
            # Publish each current verified value, including unchanged cells, so
            # a subsequent Sheet edit can be detected before applying the patch.
            if fields:
                guarded = set(fields) | {"account_label", "account_size_usd", "firm_key", "discount_code", "discount_pct", "discounted_eval_usd"}
                patches.append({"key": key, "expected": {k: row.get(k, "") for k in sorted(guarded)},
                                "values": fields, "verifiedAt": now.isoformat(),
                                "expiresAt": min(expires, now + timedelta(hours=18)).isoformat(),
                                **({"promotionExpiresAt": expires.isoformat()} if verified_coupon and "discount_code" in fields else {}),
                                "source": SOURCES[firm], "evidence": evidence,
                                "sha256": hashlib.sha256(source.encode()).hexdigest()})
        except (ValueError, KeyError, TypeError, IndexError) as exc:
            review.append({"key": key, "reason": str(exc)})
    unsupported = {k: v for k, v in coverage.items() if k not in ADAPTERS}
    diagnostics = {}
    for firm, source in sources.items():
        if isinstance(source, str):
            title = re.search(r"<title[^>]*>(.*?)</title>", source, re.S | re.I)
            diagnostics[firm] = {"bytes": len(source.encode()), "title": html.unescape(title[1]).strip()[:200] if title else ""}
        else:
            diagnostics[firm] = {"error": str(source)}
    return {"schemaVersion": 1, "generatedAt": now.isoformat(), "patches": patches,
            "review": review, "unsupportedFirms": unsupported, "coverage": coverage,
            "sourceDiagnostics": diagnostics}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", type=Path, help="Directory containing sheet.csv and <firm>.html for offline checks")
    parser.add_argument("--output", type=Path, default=ROOT / "data/firm-updates.json")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    sheet = (args.fixtures / "sheet.csv").read_text() if args.fixtures else fetch(os.environ.get("SHEET_CSV_URL", SHEET))
    rows = list(csv.DictReader(io.StringIO(sheet)))
    if not rows or not {"key", "firm_key", "eval_cost_usd", "discount_code"} <= rows[0].keys():
        raise ValueError("Unexpected Sheet schema; no output written")
    sources = {}
    def read(item):
        firm, url = item
        try:
            return firm, (args.fixtures / (firm + ".html")).read_text() if args.fixtures else fetch(url)
        except Exception as exc:
            return firm, {"error": str(type(exc).__name__) + ": " + str(exc)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        sources.update(executor.map(read, SOURCES.items()))
    result = build(rows, sources, now)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    changed = [(p["key"], k, p["expected"].get(k), v) for p in result["patches"] for k, v in p["values"].items() if p["expected"].get(k) != v]
    summary = ["## MadProps automatic update", "", f"Verified plans: {len(result['patches'])}; changed cells: {len(changed)}; review items: {len(result['review'])}.", "", "| Plan | Field | Sheet | Verified source |", "|---|---|---|---|"]
    summary += ["| " + " | ".join(str(v).replace("|", "/").replace("\n", " ") for v in change) + " |" for change in changed]
    summary += ["", "### Needs review", ""] + [f"- {r['key']}: {r['reason']}" for r in result["review"]]
    summary += ["", "### Firms awaiting adapters", "", ", ".join(result["unsupportedFirms"])]
    report = "\n".join(summary) + "\n"
    print(report)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as out:
            out.write(report)
    if not result["patches"]:
        raise RuntimeError("No plans verified; refusing to publish")


if __name__ == "__main__":
    main()
