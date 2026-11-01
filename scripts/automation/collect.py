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
import urllib.parse
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
    # Accessible official storefront candidates; no prices are published until
    # an account-specific adapter is implemented and validated.
    "alphafutures": "https://alpha-futures.com/",
    "aquafutures": "https://aquafutures.io/",
    "blue-guardian": "https://blueguardian.com/",
    "blusky-trading": "https://blusky.pro/",
    "bulenox": "https://bulenox.com/",
    "e8futures": "https://e8markets.com/",
    "fundednext": "https://fundednext.com/",
    "fundedfutures": "https://www.fundedfuturesnetwork.com/",
    # Public JSON used by the official storefront (thelegendstrading.com/plans).
    "legendstrading": "https://api.thelegendstrading.com/shop/plans?purchasableOnly=true&broker=Tradovate",
    "my-funded-futures": "https://myfundedfutures.com/",
    "phidias": "https://phidiaspropfirm.com/",
    "purdia": "https://purdia.com/",
    "takeprofittrader": "https://takeprofittrader.com/",
    "top-one-futures": "https://toponefutures.com/",
    "tradeday": "https://tradeday.com/",
    "traderslaunch": "https://traderslaunch.com/",
}
# Storefronts that only answer browser-like clients (Cloudflare-fronted).
BROWSER_FETCH = {"phidias", "fundedfutures"}
# Single-page apps whose plan data lives in a hashed same-origin script.
BUNDLE_FETCH = {"bulenox"}
PRICE_FIELDS = {"eval_cost_usd", "discount_pct", "discounted_eval_usd", "discount_code"}
ALLOWED = PRICE_FIELDS | {"activation_fee_usd", "min_days (Eval)", "ddt"}
LITERALS = {}
# MadProps affiliate codes. Firms give these the same discount as their current
# public promotion, so they are kept and take that promotion's discount. Every
# other Sheet code (or a blank one) is replaced by the firm's current public code.
# Mirrors AFFILIATE_CODES in lib/firmUpdates.ts.
AFFILIATE_CODES = {"MAD", "MADPROPS"}
COUPON = re.compile(r"[A-Za-z0-9_-]{1,40}")


def coupon_code(row, public_code):
    current = row.get("discount_code", "").strip()
    return current if current.upper() in AFFILIATE_CODES else public_code


def fetch(url, browser=False):
    if browser:
        # Browser-like TLS fingerprint for storefronts that refuse plain
        # clients. Still a single GET of the public page; no JavaScript runs.
        from curl_cffi import requests as cffi_requests
        response = cffi_requests.get(url, impersonate="chrome", timeout=40)
        response.raise_for_status()
        if len(response.content) > 5_000_000:
            raise ValueError("Source exceeds 5 MB limit")
        return response.content.decode("utf-8-sig")
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


def fetch_source(firm, url):
    """Fetch a firm's official source as text.

    BROWSER_FETCH firms are read with a browser fingerprint. BUNDLE_FETCH firms
    are single-page apps whose plan data ships in one hashed same-origin
    script (``/assets/index-<hash>.js``); the page is read only to find that
    file name, and the script is returned as text (never executed).
    """
    page = fetch(url, browser=firm in BROWSER_FETCH)
    if firm not in BUNDLE_FETCH:
        return page
    scripts = set(re.findall(r'<script[^>]+src="(/assets/index-[A-Za-z0-9_-]+\.js)"', page))
    if len(scripts) != 1:
        raise ValueError("Expected exactly one app bundle on the official page")
    return fetch(urllib.parse.urljoin(url, scripts.pop()), browser=firm in BROWSER_FETCH)


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
    verified = promo.get("active") is True and expires > now and code is not None
    if verified:
        fields["discount_code"] = coupon_code(row, code[1])
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
    verified = isinstance(coupon[0], str) and bool(COUPON.fullmatch(coupon[0])) and expires > now
    if verified:
        fields["discount_code"] = coupon_code(row, coupon[0])
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


BLUE_GUARDIAN_PRODUCT = re.compile(
    r'\{"market":"futures","plan":"(?:standard|reserve|express|direct)",[^{}]*\}')


def next_flight_payload(text):
    """Join Next.js flight chunks, decoding each as a JSON string literal (never eval)."""
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)', text)
    return "".join(json.loads('"' + chunk + '"') for chunk in chunks)


def blue_guardian(text, row, now):
    """Futures plan sizes (regular, sale, coupon) from the storefront payload.

    Every repeated plan copy and every platform product must agree, the sale
    price must match the coupon's percentage, and fractional strike-through
    prices (derived from the sale price) are refused. The site publishes no
    promotion end date, so the promotion is never persisted beyond the patch.
    """
    m = re.fullmatch(r"(Standard|Reserve|Express|Direct) (25|50|100|150)K", row["account_label"])
    size = int(row["account_size_usd"])
    if not m or int(m[2]) * 1000 != size:
        raise ValueError("Unknown Blue Guardian plan label")
    plan = m[1].lower()
    payload = next_flight_payload(text)
    decoder = json.JSONDecoder()
    sizes = []
    for start in re.finditer(r'\{"id":\d+,"market":"futures","key":"' + plan + '"', payload):
        obj, _ = decoder.raw_decode(payload, start.start())
        if obj.get("disabled") is False:
            sizes += [s for s in obj.get("sizes", []) if s.get("amount") == size]
    regular, sale, code, label = unique([
        (s.get("originalPrice"), s.get("currentPrice"), (s.get("coupon") or {}).get("code"),
         (s.get("coupon") or {}).get("label")) for s in sizes])
    products = [p for p in (json.loads(raw) for raw in BLUE_GUARDIAN_PRODUCT.findall(payload))
                if p.get("plan") == plan and p.get("accountType") == "standard" and p.get("amount") == size]
    if unique([(p.get("originalPrice"), p.get("currentPrice")) for p in products]) != (regular, sale):
        raise ValueError("Blue Guardian plan and product prices disagree")
    if not isinstance(regular, int) or isinstance(regular, bool):
        raise ValueError("Blue Guardian regular price is derived, not published")
    fields = {"eval_cost_usd": money(regular)}
    pct = re.fullmatch(r"save (\d{1,2})% with code", str(label or "").strip(), re.I)
    verified = bool(pct and isinstance(code, str) and COUPON.fullmatch(code))
    if verified:
        exact = round(regular * (1 - int(pct[1]) / 100), 2)
        if abs(float(money(sale)) - exact) > 1:
            raise ValueError("Blue Guardian sale price does not match its coupon")
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = pct[1]
        fields["discounted_eval_usd"] = money(sale) if abs(float(money(sale)) - exact) >= .005 else ""
    return fields, verified, None, (
        f"Blue Guardian futures {m[1]} {m[2]}K, regular {money(regular)}, sale {money(sale)}, "
        f"code {code}, all copies and platforms agree")


def my_funded_futures(text, row, now):
    """MFFU product pricing from the Next.js flight payload.

    The storefront embeds a categories dict (Rapid, Builder, Pro, …) in the
    flight data.  Each product carries ``price_data`` (regular price) and
    ``coupon_data`` (active coupon with amountOff / typeOff).  No promotion end
    date is published, so promos live only as 18-hour patches.
    """
    label = row["account_label"].strip()
    size = int(row["account_size_usd"])
    # The Sheet label may be just the category ("Builder") or include the size
    # ("Builder 25K").  Accept both forms.
    m = re.fullmatch(r"(Builder|Rapid|Rapid EOD|Pro)(?: (\d+)K?)?", label, re.I)
    if not m:
        raise ValueError("Unknown MFFU plan label")
    cat = m[1]
    if m[2] and int(m[2]) * 1000 != size:
        raise ValueError("MFFU label/size mismatch")

    payload = next_flight_payload(text)
    # Locate the categories dict: {"Rapid": [...], "Builder": [...], ...}
    idx = payload.find('"Rapid":[')
    if idx < 0:
        raise ValueError("MFFU categories not found in flight payload")
    start = idx - 1
    depth = 0
    while start > 0:
        if payload[start] == '}':
            depth += 1
        if payload[start] == '{':
            if depth == 0:
                break
            depth -= 1
        start -= 1
    categories, _ = json.JSONDecoder().raw_decode(payload, start)
    items = categories.get(cat)
    if not items:
        raise ValueError(f"MFFU category '{cat}' not found")

    matches = [p for p in items
               if p.get("account_size") == size and p.get("active") is True]
    if len(matches) != 1:
        raise ValueError(f"Expected 1 active MFFU product for {cat} {size}, found {len(matches)}")
    product = matches[0]
    pd = product.get("price_data") or {}
    cd = product.get("coupon_data") or {}
    price = pd.get("price")
    if not isinstance(price, (int, float)) or price <= 0:
        raise ValueError("MFFU price missing or invalid")
    fields = {"eval_cost_usd": money(price)}
    code = cd.get("code")
    pct = cd.get("amountOff")
    verified = (cd.get("active") is True and isinstance(code, str) and COUPON.fullmatch(code)
                and cd.get("typeOff") == "%" and isinstance(pct, (int, float)) and 0 < pct <= 100)
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = str(int(pct))
        sale = round(price * (1 - pct / 100), 2)
        fields["discounted_eval_usd"] = money(sale) if sale != price else ""
    return fields, verified, None, (
        f"MFFU {cat} {m[2]}K, price {money(price)}, coupon {code} {pct}%")


def tradeday(text, row, now):
    """TradeDay pricing from the Webflow HTML.

    Cards are duplicated per platform (Tradovate / Rithmic); both copies must
    agree.  The coupon code (TDNEW) is shown in the navbar, and the discount
    badge is on each card.  No promotion end date is published.
    """
    label = row["account_label"]
    size = int(row["account_size_usd"])
    m = re.fullmatch(r"(Quick Pay|Fast Pass) (Intraday|EOD)", label, re.I)
    if not m:
        raise ValueError("Unknown TradeDay plan label")
    account = m[1]
    dd_label = "End of Day" if m[2].upper() == "EOD" else m[2]
    size_k = size // 1000

    # Parse all pricing cards
    cards = []
    for cm in re.finditer(r'class="pricing-card_item"', text):
        next_cm = re.search(r'class="pricing-card_item"', text[cm.end():])
        end = cm.end() + next_cm.start() if next_cm else cm.end() + 5000
        card = text[cm.start():end]

        dd = re.search(r'fs-list-field="drawdown"[^>]*>([^<]+)', card)
        sz = re.search(r'text-size-large[^>]*>(\d+)k', card, re.I)
        acct = re.search(r'fs-list-field="account"[^>]*>([^<]+)', card)
        if not dd or not sz or not acct:
            continue
        header = re.search(r'pricing-card_header(.*?)pricing-card_list', card, re.S)
        if not header:
            continue
        vals = re.findall(r'display-inline">(.*?)</div>', header.group())
        if len(vals) < 4:
            continue
        orig = int(vals[1].replace(',', ''))
        sale = int(vals[3].replace(',', ''))
        disc = re.search(r'pricing-card_discount[^>]*>(\d+)%', card)
        cards.append((acct.group(1).strip(), dd.group(1).strip(),
                       int(sz.group(1)), orig, sale,
                       int(disc.group(1)) if disc else None))

    matches = [(orig, sale, pct) for (a, d, s, orig, sale, pct) in cards
               if a == account and d == dd_label and s == size_k]
    if not matches:
        raise ValueError(f"No TradeDay card for {account} {dd_label} {size_k}k")
    orig, sale, pct = unique(matches)

    # Coupon code from the navbar
    code_m = re.search(r'fs-copyclip-text="([A-Za-z0-9_-]+)"', text)
    code = code_m.group(1) if code_m else None

    fields = {"eval_cost_usd": money(orig)}
    verified = (pct is not None and isinstance(code, str) and COUPON.fullmatch(code)
                and 0 < pct <= 100)
    if verified:
        exact = round(orig * (1 - pct / 100))
        if abs(sale - exact) > 1:
            raise ValueError("TradeDay sale price does not match its discount badge")
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = str(pct)
        fields["discounted_eval_usd"] = money(sale)
    return fields, verified, None, (
        f"TradeDay {account} {dd_label} {size_k}k, "
        f"regular {money(orig)}, sale {money(sale)}, code {code} {pct}%, platforms agree")


def fundednext(text, row, now):
    """FundedNext futures pricing from the Next.js flight payload.

    The storefront embeds a market object ``{"id":"futures",...}`` with packages
    (Flex, Rapid, Direct).  Each package lists challengesSubVariant entries,
    each with challenge objects carrying ``originalPrice`` and ``discountedPrice``.
    DLL Add-On and Legacy plans are not on the storefront.
    """
    label = row["account_label"].strip()
    size = int(row["account_size_usd"])
    LABEL_MAP = {
        "Rapid Daily":  ("rapid", "daily"),
        "Rapid Pro":    ("rapid", "pro"),
        "Flex":         ("flex",  "default"),
    }
    mapped = LABEL_MAP.get(label)
    if not mapped:
        raise ValueError(f"FundedNext plan '{label}' is not on the storefront")
    pkg_id, variant_type = mapped

    payload = next_flight_payload(text)
    m = re.search(r'\{"id":"futures"', payload)
    if not m:
        raise ValueError("FundedNext futures section not found in flight payload")
    futures, _ = json.JSONDecoder().raw_decode(payload, m.start())

    packages = {p["id"]: p for p in futures.get("packages", [])}
    pkg = packages.get(pkg_id)
    if not pkg:
        raise ValueError(f"FundedNext package '{pkg_id}' not found")

    sub_variants = {sv["variantType"]: sv for sv in pkg.get("challengesSubVariant", [])}
    sv = sub_variants.get(variant_type)
    if not sv:
        raise ValueError(f"FundedNext variant '{variant_type}' not in package '{pkg_id}'")

    challenges = [c for c in sv.get("challenges", [])
                  if c.get("numericAccountSize") == size]
    if len(challenges) != 1:
        raise ValueError(f"Expected 1 FundedNext challenge for {label} {size}, found {len(challenges)}")
    ch = challenges[0]

    def parse_fn_price(val):
        if not isinstance(val, str):
            raise ValueError(f"FundedNext price is not a string: {val}")
        return money(val.replace("$", "").replace(",", "").strip())

    orig = parse_fn_price(ch.get("originalPrice", ""))
    fields = {"eval_cost_usd": orig}

    badge = ch.get("promoBadge", "")
    badge_m = re.fullmatch(r"(\d{1,2})%\s*OFF", str(badge).strip(), re.I)
    promo_code = pkg.get("promoCode")
    verified = bool(badge_m and isinstance(promo_code, str) and COUPON.fullmatch(promo_code))
    if verified:
        pct = int(badge_m[1])
        disc = parse_fn_price(ch.get("discountedPrice", ""))
        exact = round(float(orig) * (1 - pct / 100), 2)
        if abs(float(disc) - exact) > 1:
            raise ValueError(f"FundedNext sale {disc} doesn't match {pct}% off {orig}")
        fields["discount_code"] = coupon_code(row, promo_code)
        fields["discount_pct"] = str(pct)
        fields["discounted_eval_usd"] = disc if abs(float(disc) - exact) >= .005 else ""

    return fields, verified, None, (
        f"FundedNext {label} {size // 1000}K, regular {orig}, "
        f"code {promo_code} {badge}, package '{pkg_id}' variant '{variant_type}'")


TOP_ONE_TAB_MAP = {
    "Elite Daily":             "Elite",
    "Elite Access":            "Elite Access",
    "Instant Sim Funded 2.0":  "Instant Sim Funded",
    "Ignite Instant Funding":  "Ignite Instant Funding",
}


def top_one_futures(text, row, now):
    """Top One Futures pricing from Webflow HTML pricing cards.

    The page uses tabs (Elite, Elite Access, Instant Sim Funded, Ignite Instant
    Funding) with v3-pricing-slide cards inside each pane.  Each card shows
    a strikethrough ``v3-price-old`` and a sale ``v3-price-current``, plus a
    ``% OFF`` discount badge.  Coupon codes are in ``v2-copy-text`` elements
    near each card.
    """
    label = row["account_label"].strip()
    size = int(row["account_size_usd"])
    tab_name = TOP_ONE_TAB_MAP.get(label)
    if not tab_name:
        raise ValueError(f"Unknown Top One Futures plan label: {label}")
    size_k = size // 1000

    pane_pattern = (r'data-w-tab="' + re.escape(tab_name)
                    + r'"[^>]*class="[^"]*w-tab-pane')
    pane_matches = list(re.finditer(pane_pattern, text))
    if not pane_matches:
        raise ValueError(f"Top One tab pane '{tab_name}' not found")
    pane_start = pane_matches[-1].start()

    # Only main plan tabs mark a pane boundary; ignore nested Eval/Funded sub-tabs.
    main_tabs = "|".join(re.escape(t) for t in TOP_ONE_TAB_MAP.values())
    sibling = re.search(
        r'data-w-tab="(?:' + main_tabs + r')"[^>]*class="[^"]*w-tab-pane',
        text[pane_start + 1:])
    pane_end = pane_start + 1 + sibling.start() if sibling else pane_start + 80000
    section = text[pane_start:pane_end]

    slide_parts = re.split(r'(?=v3-pricing-slide)', section)
    matches = []
    for part in slide_parts[1:]:
        part = part[:8000]
        title_m = re.search(r'v3-pricing-title">([^<]+)', part)
        if not title_m:
            continue
        title = title_m.group(1).strip()
        card_size_m = re.fullmatch(
            r"\$(\d{1,3}(?:,\d{3})*)K\s*(?:Evaluation|Account)", title)
        if not card_size_m:
            continue
        card_size = int(card_size_m[1].replace(",", ""))
        if card_size != size_k:
            continue
        old_m = re.search(r'v3-price-old">\$(\d[\d,]*)', part)
        cur_m = re.search(r'v3-price-current">\$(\d[\d,]*)', part)
        disc_m = re.search(r'(\d{1,2})%\s*OFF', part)
        if not old_m or not cur_m:
            continue
        old_price = money(old_m[1].replace(",", ""))
        cur_price = money(cur_m[1].replace(",", ""))
        disc_pct = int(disc_m[1]) if disc_m else None
        code_m = re.search(r'v2-copy-text[^>]*>([A-Za-z0-9_-]+)', part)
        code = code_m[1].strip() if code_m else None
        matches.append((old_price, cur_price, disc_pct, code))

    if not matches:
        raise ValueError(f"No Top One card for {tab_name} {size_k}K")
    old_price, cur_price, disc_pct, code = unique(matches)

    fields = {"eval_cost_usd": old_price}
    verified = bool(disc_pct and isinstance(code, str) and COUPON.fullmatch(code)
                    and 0 < disc_pct <= 100)
    if verified:
        exact = round(float(old_price) * (1 - disc_pct / 100), 2)
        if abs(float(cur_price) - exact) > 1:
            raise ValueError(
                f"Top One sale {cur_price} doesn't match {disc_pct}% off {old_price}")
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = str(disc_pct)
        fields["discounted_eval_usd"] = (
            cur_price if abs(float(cur_price) - exact) >= .005 else "")

    return fields, verified, None, (
        f"Top One {tab_name} {size_k}K, regular {old_price}, "
        f"sale {cur_price}, code {code} {disc_pct}%")


BULENOX_PROGRAMS = {"Qualification": "qualification", "Fast Track": "fastTrack", "Momentum": "momentum"}


def bulenox(text, row, now):
    """Bulenox regular prices from the storefront's app bundle (never executed).

    The bundle defines ``[{id:`qualification`,tiers:X},{id:`fastTrack`,tiers:[...]},
    {id:`momentum`,tiers:[...]}]`` where X may be a separately declared array.
    Options 1 and 2 share one price per size. Affiliates assemble their own
    Bulenox codes, so discount fields stay manual: only ``eval_cost_usd`` is
    published, and only when the row has no fixed discounted-price override
    that a new regular price would make stale.
    """
    m = re.fullmatch(r"(Qualification|Fast Track|Momentum) Option ([12])", row["account_label"].strip())
    size = int(row["account_size_usd"])
    if not m or size not in (25000, 50000, 100000, 150000):
        raise ValueError("Unknown Bulenox plan label")
    program = BULENOX_PROGRAMS[m[1]]
    blocks = re.findall(r"\{id:`" + program + r"`,tiers:(\[[^\[\]]*\]|[A-Za-z_$][\w$]*)\}", text)
    if len(blocks) != 1:
        raise ValueError(f"Expected exactly one Bulenox '{program}' program")
    tiers = blocks[0]
    if not tiers.startswith("["):
        declared = re.findall(r"(?<![\w$.])" + re.escape(tiers) + r"=(\[\{size:[^\[\]]*\])", text)
        if len(declared) != 1:
            raise ValueError(f"Bulenox tiers variable for '{program}' not found exactly once")
        tiers = declared[0]
    prices = []
    for tier in re.findall(r"\{[^{}]*\}", tiers):
        tier_size = re.search(r"\bsize:`\$([\d,]+)`", tier)
        price = re.search(r"\bprice:`\$([\d,]+(?:\.\d{1,2})?)`", tier)
        if tier_size and price and int(tier_size[1].replace(",", "")) == size:
            prices.append(money(price[1]))
    regular = unique(prices)
    if row.get("discounted_eval_usd", "").strip() and regular != money(row.get("eval_cost_usd") or "0"):
        raise ValueError("Bulenox price changed but the row has a fixed discounted price; update it by hand")
    # True = regular price verified; discount fields are deliberately absent.
    return {"eval_cost_usd": regular}, True, None, (
        f"Bulenox {m[1]} {size // 1000}K (Option {m[2]}), regular {regular}; codes are managed manually")


PHIDIAS_PLANS = {"Express to Live": "e2l", "Fundamental": "fundamental", "Premium": "premium"}


def phidias(text, row, now):
    """Phidias one-time (OTP) prices and OTP discounts from ``window.phidiasPromo``.

    The Sheet lists the one-time-payment price, so ``prices[k].otp`` is the
    regular price and ``discounts.otp[k]`` its current percentage off.
    """
    plan = PHIDIAS_PLANS.get(row["account_label"].strip())
    if not plan:
        raise ValueError("Unknown Phidias plan label")
    key = f"{plan}_{int(row['account_size_usd']) // 1000}k"
    promo = literal(text, r"phidiasPromo\s*=\s*")
    regular = promo["prices"][key]["otp"]
    if not isinstance(regular, (int, float)) or isinstance(regular, bool) or regular <= 0:
        raise ValueError("Phidias one-time price missing")
    fields = {"eval_cost_usd": money(regular)}
    pct = promo.get("discounts", {}).get("otp", {}).get(key)
    code = promo.get("code")
    verified = bool(isinstance(code, str) and COUPON.fullmatch(code)
                    and isinstance(pct, (int, float)) and not isinstance(pct, bool) and 0 < pct <= 100)
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = money(pct)
        fields["discounted_eval_usd"] = ""
    return fields, verified, None, f"Phidias {key} one-time, regular {money(regular)}, code {code} {pct}% (OTP)"


def alpha_futures(text, row, now):
    """Alpha Futures prices from Webflow cards and the ``data-discount-offers`` JSON.

    Cards read ``<h3 class="... price">100K Zero Eval<br><span ...>$279</span>``;
    Direct plans have no evaluation, so their "Qualified" card carries the price.
    Each discount offer names the plans it applies to.
    """
    m = re.fullmatch(r"(Zero|Standard|Advanced|Direct)", row["account_label"].strip())
    if not m:
        raise ValueError("Unknown Alpha Futures plan label")
    plan, size_k = m[1], int(row["account_size_usd"]) // 1000
    stage = "Qualified" if plan == "Direct" else "Eval"
    cards = re.findall(r'<h3 class="[^"]*\bprice\b[^"]*">\s*' + str(size_k) + r"K " + plan + " " + stage
                       + r'\s*<br\s*/?>\s*<span[^>]*>\$([\d,]+(?:\.\d{1,2})?)</span>', text)
    regular = unique([money(c) for c in cards])
    fields = {"eval_cost_usd": regular}
    offers = re.findall(r'data-discount-offers="([^"]*)"', text)
    if len(set(offers)) != 1:
        raise ValueError("Expected one Alpha Futures discount-offer list")
    matching = [o for o in json.loads(html.unescape(offers[0])) if plan in o.get("plans", [])]
    offer = matching[0] if len(matching) == 1 else {}
    code, pct = offer.get("code"), offer.get("percent")
    verified = bool(isinstance(code, str) and COUPON.fullmatch(code)
                    and isinstance(pct, (int, float)) and not isinstance(pct, bool) and 0 < pct <= 100)
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = money(pct)
        fields["discounted_eval_usd"] = ""
    return fields, verified, None, f"Alpha Futures {size_k}K {plan} {stage}, regular {regular}, code {code} {pct}%"


def pct_off(regular, sale):
    """Whole-number percentage that turns ``regular`` into ``sale``, or None."""
    regular, sale = float(regular), float(sale)
    if not 0 < sale < regular:
        return None
    pct = round((1 - sale / regular) * 100)
    return pct if abs(regular * (1 - pct / 100) - sale) <= .01 else None


def legends_trading(text, row, now):
    """Legends Trading prices from the storefront's public plans API (JSON).

    ``price`` is the regular price, ``strikeThroughPrice`` the sale price after
    ``activeCoupon``; the percentage is derived and must be a whole number.
    """
    m = re.fullmatch(r"(Apprentice|Elite) (\d+)K", row["account_label"].strip(), re.I)
    if not m or int(m[2]) * 1000 != int(row["account_size_usd"]):
        raise ValueError("Unknown Legends Trading plan label")
    category, size_k = m[1].capitalize(), int(m[2])
    plans = json.loads(text)["data"]
    matches = [p for p in plans if p.get("productCategory") == category
               and str(p.get("dashboardDisplayName", "")).strip().lower() == f"{size_k}k {category}".lower()]
    plan = unique(matches)
    regular = money(plan["price"])
    fields = {"eval_cost_usd": regular}
    code, sale = plan.get("activeCoupon"), plan.get("strikeThroughPrice")
    pct = pct_off(regular, money(sale)) if sale is not None else None
    verified = bool(isinstance(code, str) and COUPON.fullmatch(code) and pct)
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = str(pct)
        fields["discounted_eval_usd"] = ""
    recurring = " (monthly)" if plan.get("isPriceRecurring") else ""
    return fields, verified, None, (
        f"Legends {category} {size_k}K{recurring}, regular {regular}, sale {sale}, code {code} {pct}%")


FFN_PLANS = {"MAX Standard": "MAX Standard", "STEADY": "STEADY"}


def funded_futures(text, row, now):
    """Funded Futures Network prices from the ``plans-data`` JSON on its homepage.

    Each plan carries ``tier: "$50K STEADY Account"`` and a one-time ``price``.
    Coupons live in ``data-coupon-platforms`` per data feed (CQG/Rithmic); the
    coupon is only verified when every feed offers the same code and percent.
    """
    plan = FFN_PLANS.get(row["account_label"].strip())
    if not plan:
        raise ValueError("Unknown Funded Futures Network plan label")
    size_k = int(row["account_size_usd"]) // 1000
    blocks = re.findall(r'<script type="application/json" id="plans-data">(.*?)</script>', text, re.S)
    if len(blocks) != 1:
        raise ValueError("Expected exactly one Funded Futures plans-data block")
    tier = f"${size_k}K {plan} Account"
    matches = [p for size in json.loads(blocks[0]).values() for p in size.values()
               if isinstance(p, dict) and p.get("tier") == tier]
    product = unique(matches)
    if product.get("billing") != "one_time":
        raise ValueError("Funded Futures plan is not a one-time price")
    regular = money(product["price"])
    fields = {"eval_cost_usd": regular}
    coupons = re.findall(r"<script type=\"application/json\" data-coupon-platforms>(.*?)</script>", text, re.S)
    offers = list(json.loads(coupons[0]).values()) if len(coupons) == 1 else []
    terms = {(o.get("code"), o.get("percent")) for o in offers
             if o.get("valid") is True and o.get("type") == "percentage"}
    code, pct = next(iter(terms)) if len(terms) == 1 and len(offers) == len(
        [o for o in offers if o.get("valid") is True]) else (None, None)
    verified = bool(isinstance(code, str) and COUPON.fullmatch(code)
                    and isinstance(pct, (int, float)) and not isinstance(pct, bool) and 0 < pct <= 100)
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = money(pct)
        fields["discounted_eval_usd"] = ""
    feeds = ", ".join(f"{c} {p}%" for c, p in sorted(terms, key=str)) or "none"
    return fields, verified, None, f"Funded Futures {tier}, regular {regular}, coupons by feed: {feeds}"


ADAPTERS = {"apex": apex, "tradeify": tradeify, "daytraders": daytraders, "lucid": lucid,
            "blue-guardian": blue_guardian, "my-funded-futures": my_funded_futures,
            "tradeday": tradeday, "fundednext": fundednext,
            "top-one-futures": top_one_futures, "bulenox": bulenox,
            "phidias": phidias, "alphafutures": alpha_futures,
            "legendstrading": legends_trading, "fundedfutures": funded_futures}


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
                                # expires=None: the source publishes no end date, so the
                                # promotion lives only as long as this 18h patch.
                                "expiresAt": min(expires or now + timedelta(hours=18), now + timedelta(hours=18)).isoformat(),
                                **({"promotionExpiresAt": expires.isoformat()} if verified_coupon and expires and "discount_code" in fields else {}),
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
            return firm, (args.fixtures / (firm + ".html")).read_text() if args.fixtures else fetch_source(firm, url)
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
