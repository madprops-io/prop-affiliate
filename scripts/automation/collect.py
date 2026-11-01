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
    # Plan list prices ship in the inline window.AQ_TABLE_CONFIG script.
    "aquafutures": "https://aquafutures.io/",
    "blue-guardian": "https://blueguardian.com/",
    # Plan prices and codes ship in the inline `const skyData` table.
    "blusky-trading": "https://blusky.pro/",
    "bulenox": "https://bulenox.com/",
    # Futures products (prices, discount, code) ship in this page's Nuxt payload.
    "e8futures": "https://e8markets.com/e8-markets-discount-code",
    "fundednext": "https://fundednext.com/",
    "fundedfutures": "https://www.fundedfuturesnetwork.com/",
    # Public JSON used by the official storefront (thelegendstrading.com/plans).
    "legendstrading": "https://api.thelegendstrading.com/shop/plans?purchasableOnly=true&broker=Tradovate",
    "my-funded-futures": "https://myfundedfutures.com/",
    "phidias": "https://phidiaspropfirm.com/",
    "purdia": "https://purdia.com/",
    # Homepage carries the promo banner; prices come from COMPANION_JSON below.
    "takeprofittrader": "https://takeprofittrader.com/",
    "top-one-futures": "https://toponefutures.com/",
    "tradeday": "https://tradeday.com/",
    # Server-rendered pricing cards (default split only).
    "traderslaunch": "https://traderslaunch.com/",
}
# Storefronts that only answer browser-like clients (Cloudflare-fronted).
BROWSER_FETCH = {"phidias", "fundedfutures"}
# Single-page apps whose plan data lives in a hashed same-origin script.
BUNDLE_FETCH = {"bulenox", "purdia"}
# Firms whose prices come from a public same-origin JSON endpoint while the
# coupon is shown on the page. The JSON is appended to the page as an inert
# <script type="application/json" id="madprops-companion"> block.
COMPANION_JSON = {"takeprofittrader": "https://takeprofittrader.com/accounts/api/subscriptions"}
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

    BROWSER_FETCH firms are read with a browser fingerprint. COMPANION_JSON
    firms get their public JSON endpoint appended as an inert script block.
    BUNDLE_FETCH firms are single-page apps whose plan data ships in one
    hashed same-origin script (``/assets/index-<hash>.js``); the page is read
    only to find that file name, and the script is returned as text (never
    executed).
    """
    page = fetch(url, browser=firm in BROWSER_FETCH)
    if firm in COMPANION_JSON:
        data = fetch(COMPANION_JSON[firm], browser=firm in BROWSER_FETCH)
        json.loads(data)  # must be JSON; never executed
        return (page + '\n<script type="application/json" id="madprops-companion">'
                + data.replace("</", "<\\/") + "</script>\n")
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
    Coupons live in ``data-coupon-platforms`` per data feed (CQG/Rithmic).
    Per TJ (Nov 1 2026) the best verified discount is shown: the highest
    percentage among valid feed offers. It is held if any valid offer is not
    a percentage, or if different codes tie for the best percentage.
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
    feeds = json.loads(coupons[0]) if len(coupons) == 1 else {}
    feeds = feeds if isinstance(feeds, dict) else {}
    valid = {feed: o for feed, o in feeds.items() if isinstance(o, dict) and o.get("valid") is True}
    terms = {(feed, o.get("code"), o.get("percent")) for feed, o in valid.items()}
    well_formed = bool(valid) and all(
        o.get("type") == "percentage" and isinstance(o.get("code"), str) and COUPON.fullmatch(o["code"])
        and isinstance(o.get("percent"), (int, float)) and not isinstance(o.get("percent"), bool)
        and 0 < o["percent"] <= 100 for o in valid.values())
    code = pct = None
    best_feeds = []
    if well_formed:
        pct = max(p for _, _, p in terms)
        best = {(c, p) for _, c, p in terms if p == pct}
        best_feeds = sorted(f for f, _, p in terms if p == pct)
        code = next(iter(best))[0] if len(best) == 1 else None
    verified = code is not None
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = money(pct)
        fields["discounted_eval_usd"] = ""
    feeds = ", ".join(f"{f} {c} {p}%" for f, c, p in sorted(terms, key=str)) or "none"
    best_note = f"; best {code} {pct}% on {'/'.join(best_feeds)}" if verified else "; best discount not verified"
    return fields, verified, None, f"Funded Futures {tier}, regular {regular}, coupons by feed: {feeds}{best_note}"


PURDIA_SLUGS = {"Instant Funded": "{k}k-instant-funded", "Pioneer Pilot": "{k}k-pilot-pioneer",
                "EOD Evaluation": "{k}k-eod-evaluation", "Pro Evaluation": "{k}k-pro-evaluation"}


def purdia(text, row, now):
    """Purdia prices from the accounts catalogue in its app bundle (read as text, never run).

    Per TJ (Nov 1 2026) the catalogue built around the site-wide code (TRY60)
    is used, not the October homepage list (OCT50). The bundle maps that
    catalogue through one function that sets ``discountCode`` and prices
    every card at ``priceOriginal * <multiplier>``; the code and percent are
    read from that function. A plan is matched by slug and must be a card
    whose checkout link carries the same code. A plan missing from that
    catalogue (e.g. Pro Evaluation) fails closed. The card's top-level
    ``priceOriginal`` is the default (buffer-rule) price.
    """
    template = PURDIA_SLUGS.get(row["account_label"].strip())
    if not template:
        raise ValueError("Unknown Purdia plan label")
    slug = template.format(k=int(row["account_size_usd"]) // 1000)
    mapper = re.findall(r"function (\w+)\(e\)\{const t=(\w+)\(e\.priceOriginal\),a=s=>\{if\(!s\)return s;"
                        r"const r=\2\(s\.priceOriginal\);return\{\.\.\.s,priceMain:r\|\|s\.priceMain,"
                        r"discountCode:(\w+),", text)
    if len(mapper) != 1:
        raise ValueError("Expected one Purdia catalogue discount function")
    fn, pricer, code_var = mapper[0]
    if len(re.findall(r"=(\w+)\.map\(" + re.escape(fn) + r"\)", text)) != 1:
        raise ValueError("Expected one Purdia discounted catalogue")
    mult = re.findall(r"function " + re.escape(pricer) + r"\(e\)\{[^}]{0,200}?Math\.round\(Math\.round\(t\*100\)\*"
                      r"(0?\.\d+)\)/100", text)
    codes = set(re.findall(r"(?<![\w$.])" + re.escape(code_var) + r'="([^"]*)"', text))
    if len(mult) != 1 or len(codes) != 1:
        raise ValueError("Purdia discount multiplier or code not found exactly once")
    code = codes.pop()
    pct = round((1 - float(mult[0])) * 100, 6)
    cards = []
    for m in re.finditer(r'slug:"' + re.escape(slug) + '"', text):
        end = text.find('slug:"', m.end())
        card = text[m.start():end if end > 0 else len(text)]
        uses_code = re.search(r"discount:" + re.escape(code_var) + r"\}|,\s*" + re.escape(code_var) + r"\)", card)
        price = re.search(r'priceOriginal:"([^"]+)"', card)
        if uses_code and price:
            cards.append(money(price[1]))
    regular = unique(cards)
    fields = {"eval_cost_usd": regular}
    verified = bool(COUPON.fullmatch(code) and pct == int(pct) and 0 < pct < 100)
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = str(int(pct))
        fields["discounted_eval_usd"] = ""
    return fields, verified, None, f"Purdia {slug}, regular {regular}, code {code} {pct:g}% (catalogue multiplier {mult[0]})"


NUXT_WRAPPERS = {"Reactive", "ShallowReactive", "Ref", "ShallowRef"}


def nuxt_data(text, *path):
    """Follow ``path`` through a Nuxt ``__NUXT_DATA__`` payload (devalue format).

    The payload is a flat JSON array: objects map keys to indexes, arrays list
    indexes, and ``["Reactive", i]``-style wrappers point at the real value.
    Only the requested branch is decoded; nothing is evaluated.
    """
    blocks = re.findall(r'<script[^>]*\bid="__NUXT_DATA__"[^>]*>(.*?)</script>', text, re.S)
    if len(blocks) != 1:
        raise ValueError("Expected exactly one __NUXT_DATA__ block")
    flat = json.loads(blocks[0])

    def resolve(index, depth=0):
        if depth > 40 or not isinstance(index, int) or isinstance(index, bool):
            raise ValueError("Malformed __NUXT_DATA__ reference")
        if index < 0:
            return None  # devalue sentinels (undefined, hole, NaN, ...)
        value = flat[index]
        while isinstance(value, list) and value and isinstance(value[0], str):
            if value[0] not in NUXT_WRAPPERS or len(value) != 2:
                raise ValueError(f"Unsupported __NUXT_DATA__ type {value[0]}")
            value = flat[value[1]]
        if isinstance(value, dict):
            return {k: (lambda i=i: resolve(i, depth + 1)) for k, i in value.items()}
        if isinstance(value, list):
            return [(lambda i=i: resolve(i, depth + 1)) for i in value]
        return value

    def materialize(value):
        if callable(value):
            value = value()
        if isinstance(value, dict):
            return {k: materialize(v) for k, v in value.items()}
        if isinstance(value, list):
            return [materialize(v) for v in value]
        return value

    node = resolve(0)
    for key in path:
        if not isinstance(node, dict) or key not in node:
            raise KeyError(f"__NUXT_DATA__ path missing: {key}")
        node = node[key]()
    return materialize(node)


E8_PRODUCTS = {"Signature": "e8signature_v_fu", "Zero MAX": "e8zero_max_fu", "Zero Starter": "e8zero_start_fu"}


def e8_futures(text, row, now):
    """E8 futures prices from the ``global-data`` products in the site's Nuxt payload.

    Each futures product has ``balances[size].price`` (one-time USD) and a
    ``discount``/``discountCode``. The tiered ``settings.pricing`` list, when
    present, must agree with the balance price. The coupon is verified only
    when the first-purchase and regular discounts are the same.
    """
    product_id = E8_PRODUCTS.get(row["account_label"].strip())
    if not product_id:
        raise ValueError("Unknown E8 futures plan label")
    size = int(row["account_size_usd"])
    product = nuxt_data(text, "data", "global-data", "data", "products")[product_id]
    if product.get("id") != product_id or "TRADOVATE" not in product.get("settings", {}).get("platforms", []):
        raise ValueError("E8 product is not the expected futures plan")
    balance = product["balances"].get(str(size))
    if not balance or balance.get("balance") != size:
        raise ValueError(f"E8 {product_id} has no {size // 1000}K account")
    regular = money(balance["price"])
    tiers = [money(t["price"]) for t in product["settings"].get("pricing") or [] if t.get("depositFrom") == size]
    if tiers and unique(tiers) != regular:
        raise ValueError("E8 tier price disagrees with account price")
    fields = {"eval_cost_usd": regular}
    code, pct, first = product.get("discountCode"), product.get("discount"), product.get("firstDiscount")
    verified = bool(isinstance(code, str) and COUPON.fullmatch(code) and pct == first
                    and isinstance(pct, (int, float)) and not isinstance(pct, bool) and 0 < pct <= 100)
    if verified:
        fields["discount_code"] = coupon_code(row, code)
        fields["discount_pct"] = money(pct)
        fields["discounted_eval_usd"] = ""
    return fields, verified, None, (
        f"E8 {row['account_label'].strip()} {size // 1000}K ({product_id}), regular {regular}, "
        f"code {code} {pct}% (first purchase {first}%)")


AQUA_PLANS = {"Beginner": ("One Step", "beginner"), "Standard": ("Daily", "standard"),
              "Flex": ("One Step", "flex"), "Instant Standard": ("Instant", "standard")}


def aqua_futures(text, row, now):
    """Aqua Futures list prices from ``window.AQ_TABLE_CONFIG`` on its homepage.

    ``futures[model][type].platforms[platform].prices['50k']`` is the list
    price; every platform must agree, and the size must be offered
    (``availableAccounts``). A model or type in ``hiddenModels`` /
    ``hiddenTypes`` is not shown on the site and fails closed. The site shows
    ``Math.floor`` of the list price, so that whole-dollar value is used.
    The page applies a code-less ``bulkDiscount.futures`` percentage to every
    futures plan automatically (no coupon code exists). A positive whole
    percentage up to 100 is verified: ``discount_pct`` takes it, the code is
    cleared (a MAD/MADPROPS Sheet code is kept, see ``coupon_code``) and
    ``discounted_eval_usd`` is cleared so the percentage drives the price.
    A missing, zero or malformed ``bulkDiscount`` holds pricing for review.
    """
    plan = AQUA_PLANS.get(row["account_label"].strip())
    if not plan:
        raise ValueError("Unknown Aqua Futures plan label")
    model, plan_type = plan
    size = f"{int(row['account_size_usd']) // 1000}k"
    config = literal(text, r"window\.AQ_TABLE_CONFIG\s*=\s*(?=\{)")
    hidden_models = [str(m).strip().lower() for m in config.get("hiddenModels", {}).get("futures", [])]
    hidden_types = [str(t).strip().lower() for t in config.get("hiddenTypes", {}).get("futures", {}).get(model, [])]
    if model.lower() in hidden_models or plan_type in hidden_types:
        raise ValueError(f"Aqua Futures {model} {plan_type} is hidden on the site")
    platforms = config["futures"][model][plan_type]["platforms"]
    prices = []
    for name, platform in platforms.items():
        offered = platform.get("availableAccounts")
        if offered and size not in offered:
            raise ValueError(f"Aqua Futures {model} {plan_type} {size} not offered on {name}")
        prices.append(money(platform["prices"][size]))
    listed = unique(prices)
    regular = money(math.floor(float(listed)))
    bulk = config.get("bulkDiscount")
    bulk = bulk.get("futures") if isinstance(bulk, dict) else None
    fields = {"eval_cost_usd": regular}
    verified = type(bulk) is int and 0 < bulk <= 100
    if verified:
        fields["discount_code"] = coupon_code(row, "")
        fields["discount_pct"] = str(bulk)
        fields["discounted_eval_usd"] = ""
    discount = f"code-less {bulk}% bulk discount applied automatically" if verified else f"no valid code-less bulk discount ({bulk!r})"
    return fields, verified, None, (
        f"Aqua Futures {model} {plan_type} {size}, list {listed} (shown {regular}) on {'/'.join(sorted(platforms))}; "
        f"{discount}, no coupon code needed")


BLUSKY_PLANS = {"Launch": "launch", "Propel": "premium", "Orbit": "orbit", "Instant Funding": "instant"}


def blusky(text, row, now):
    """BluSky prices from the ``const skyData`` plan table on its homepage.

    Each plan is ``"<size>": {"<mode>": mkPlanSky({...})}``. The call takes a
    single flat object, so it is unwrapped to a plain literal (never run).
    ``price`` is what the card charges; ``was`` is the regular price when the
    card shows a sale, and ``discount: "USE CODE: X"`` names its code. The
    "At Launch" fee is the activation fee. A Sheet label marked "Static" must
    map to a plan with a static evaluation drawdown, and vice versa.
    """
    m = re.fullmatch(r"(Launch|Propel|Orbit|Instant Funding) (\d+(?:\.\d+)?)K( Static)?", row["account_label"].strip())
    if not m or float(m[2]) * 1000 != int(row["account_size_usd"]):
        raise ValueError("Unknown BluSky plan label")
    mode, size = BLUSKY_PLANS[m[1]], m[2] + "k"
    starts = [s.end() for s in re.finditer(r"\bconst\s+skyData\s*=\s*(?=\{)", text)]
    if len(starts) != 1:
        raise ValueError("Expected exactly one BluSky skyData block")
    body = re.sub(r"\bmkPlanSky\(\s*(\{[^{}]*\})\s*\)", r"\1", text[starts[0]:])
    plan = literal(body, r"^")[size][mode]
    static = "static" in str(plan.get("evalStaticDrawdown", "")).lower()
    if static != bool(m[3]):
        raise ValueError("BluSky drawdown type disagrees with the Sheet label")
    price, was, discount = money(plan["price"]), plan.get("was") or 0, plan.get("discount") or ""
    fields = {}
    if plan.get("atLaunch") is not None:
        fields["activation_fee_usd"] = money(plan["atLaunch"])
    code = re.fullmatch(r"USE CODE:\s*([A-Za-z0-9_-]{1,40})", str(discount).strip(), re.I)
    pct = None
    if not was and not discount:
        fields["eval_cost_usd"] = price
        verified = not row["discount_code"] and row["discount_pct"] in ("", "0") and not row["discounted_eval_usd"]
    else:
        regular = money(was)
        pct = pct_off(regular, price)
        if pct is None:
            raise ValueError("BluSky sale price is not a whole-number discount of the regular price")
        fields["eval_cost_usd"] = regular
        verified = bool(code)
        if verified:
            fields["discount_code"] = coupon_code(row, code[1])
            fields["discount_pct"] = str(pct)
            fields["discounted_eval_usd"] = ""
    return fields, verified, None, (
        f"BluSky {m[1]} {size} ({mode}), price {price}, was {was or '-'}, discount '{discount}' {pct or 0}%, "
        f"at launch {plan.get('atLaunch')}")


TPT_COMPANION = re.compile(r'<script type="application/json" id="madprops-companion">(.*?)</script>', re.S)


def take_profit_trader(text, row, now):
    """Take Profit Trader prices from its public subscriptions API, coupon from the homepage banner.

    ``fetch_source`` appends the API JSON to the homepage as an inert
    ``madprops-companion`` script block. Each Test account is an item with
    ``balance`` equal to the size, a ``"$ 25k"`` name and a positive monthly
    ``price``. The coupon is verified only when the homepage promo banner
    names exactly one percentage and one code and the API shows no
    separate ``discountPrice``.
    """
    if row["account_label"].strip() != "Test":
        raise ValueError("Unknown Take Profit Trader plan label")
    size = int(row["account_size_usd"])
    blocks = TPT_COMPANION.findall(text)
    if len(blocks) != 1:
        raise ValueError("Expected exactly one Take Profit Trader subscriptions block")
    data = json.loads(blocks[0])
    if data.get("isSuccess") is not True:
        raise ValueError("Take Profit Trader subscriptions API reported failure")
    name = f"$ {size // 1000}k"
    matches = [i for i in data["result"]["items"] if i.get("balance") == size and i.get("marketType") == 0
               and str(i.get("name", "")).strip().lower() == name and (i.get("price") or 0) > 0]
    item = unique(matches)
    regular = money(item["price"])
    fields = {"eval_cost_usd": regular}
    banners = re.findall(r'data-testid="home_page-banner_promocode-promo_code-text"[^>]*>(.*?)</p>', text, re.S)
    banner = html.unescape(re.sub(r"<[^>]+>", " ", banners[0])) if len(banners) == 1 else ""
    pcts = set(re.findall(r"\b(\d{1,2})% Off\b", banner, re.I))
    codes = set(re.findall(r"\bUse Code:\s*([A-Za-z0-9_-]{1,40})\b", banner, re.I))
    verified = (len(pcts) == 1 and len(codes) == 1 and 0 < int(next(iter(pcts))) < 100
                and item.get("discountPrice") is None)
    if verified:
        fields["discount_code"] = coupon_code(row, next(iter(codes)))
        fields["discount_pct"] = next(iter(pcts))
        fields["discounted_eval_usd"] = ""
    return fields, verified, None, (
        f"Take Profit Trader {name} (id {item.get('id')}), price {regular}, discountPrice {item.get('discountPrice')}; "
        f"banner: {' '.join(banner.split())[:160] or 'none'}")


def traders_launch(text, row, now):
    """Traders Launch prices from the server-rendered pricing cards on its homepage.

    Each ``<article class="tl-plan tl-plan-futures ...">`` card links to
    checkout with ``type=futures&size=<balance>&split=<pct>&hours=<n>``; the
    standard (non-NYC) card has ``hours=2`` and a plain "starting capital"
    subtitle. Only the default split is rendered (currently 80%); a split the
    page does not render (e.g. the Sheet's 55%) fails closed. A card with
    more than one dollar amount in its price block (a sale) also fails closed.
    """
    m = re.fullmatch(r"Standard (\d{2})%", row["account_label"].strip())
    if not m:
        raise ValueError("Unknown Traders Launch plan label")
    size, split = int(row["account_size_usd"]), m[1]
    cards = []
    for part in re.split(r'(?=<article class="tl-plan tl-plan-futures\b)', text)[1:]:
        card = part[:part.find("</article>")] if "</article>" in part else ""
        link = re.search(r'href="[^"]*purchasing-signup\?type=futures&amp;size=(\d+)&amp;split=(\d+)&amp;hours=(\d+)"', card)
        subtitle = re.search(r'tl-plan-subtitle[^>]*>([^<]*)</p>', card)
        if not link or link.groups() != (str(size), split, "2") or not subtitle:
            continue
        if subtitle[1].strip() != f"${size:,} starting capital":
            continue
        block = re.search(r'class="tl-plan-price[^"]*">(.*?)One-Time Fee', card, re.S)
        amounts = re.findall(r"\$([\d,]+(?:\.\d{1,2})?)", block[1]) if block else []
        if len(amounts) != 1:
            raise ValueError("Traders Launch card price is missing or shows a sale")
        extra = {}
        fee = re.search(r"Activation Fee</dt><dd[^>]*>([^<]+)</dd>", card)
        if fee:
            extra["activation_fee_usd"] = "0" if fee[1].strip() == "None" else money(fee[1])
        days = re.search(r"Days to Pass</dt><dd[^>]*>(\d+) minimum</dd>", card)
        if days:
            extra["min_days (Eval)"] = days[1]
        if re.search(r"Max Drawdown</dt><dd[^>]*>\$[\d,]+ EOD<", card):
            extra["ddt"] = "EOD"
        cards.append({"eval_cost_usd": money(amounts[0]), **extra})
    if not cards:
        raise ValueError(f"No Traders Launch {split}% {size // 1000}K standard card on the page")
    fields = unique(cards)
    verified = not row["discount_code"] and row["discount_pct"] in ("", "0") and not row["discounted_eval_usd"]
    return dict(fields), verified, None, (
        f"Traders Launch standard {size // 1000}K {split}% split card, one-time fee {fields['eval_cost_usd']}, no sale shown")


ADAPTERS = {"apex": apex, "tradeify": tradeify, "daytraders": daytraders, "lucid": lucid,
            "blue-guardian": blue_guardian, "my-funded-futures": my_funded_futures,
            "tradeday": tradeday, "fundednext": fundednext,
            "top-one-futures": top_one_futures, "bulenox": bulenox,
            "phidias": phidias, "alphafutures": alpha_futures,
            "legendstrading": legends_trading, "fundedfutures": funded_futures,
            "e8futures": e8_futures, "purdia": purdia, "aquafutures": aqua_futures,
            "blusky-trading": blusky, "takeprofittrader": take_profit_trader,
            "traderslaunch": traders_launch}


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
                    # "" means the verified discount needs no code (code-less sale).
                    if value and not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", value):
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
