"""Review-only source intelligence for new MadProps firm adapters.

This deliberately does not produce live pricing patches. It extracts potential
structured offers and price-bearing text from official pages for human review.
"""
import argparse
import csv
import io
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re

from collect import SOURCES, ADAPTERS, fetch, ROOT, SHEET

MONEY = re.compile(r"(?<!\w)\$\s*(\d{1,5}(?:\.\d{1,2})?)(?!\d)")
SIZE = re.compile(r"(?<!\d)(25|50|75|100|150|200|250|300)\s*[kK](?!\w)")
PRICE_WORD = re.compile(r"price|evaluation|account|plan|challenge|funded|activation|discount", re.I)

class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip += 1
        if tag in ("p", "li", "h1", "h2", "h3", "td", "tr", "div"):
            self.parts.append("\n")
    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript") and self.skip:
            self.skip -= 1
    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

def extract(text):
    parser = PageText()
    parser.feed(text)
    plain = html.unescape(" ".join(parser.parts))
    lines = [" ".join(line.split()) for line in plain.splitlines()]
    candidates = []
    for line in lines:
        if MONEY.search(line) and (PRICE_WORD.search(line) or SIZE.search(line)):
            if line not in candidates:
                candidates.append(line[:300])
    offers = []
    for block in re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', text, re.I | re.S):
        try:
            obj = json.loads(html.unescape(block))
        except (ValueError, TypeError):
            continue
        def walk(item):
            if isinstance(item, list):
                for child in item: walk(child)
            elif isinstance(item, dict):
                kind = str(item.get("@type", "")).lower()
                if "offer" in kind and ("price" in item or "priceSpecification" in item):
                    offers.append({k:item[k] for k in ("name","price","priceCurrency","url") if k in item})
                for value in item.values(): walk(value)
        walk(obj)
    return {"candidateLines": candidates[:30], "structuredOffers": offers[:30]}

def match_sheet_rows(firm, details, rows):
    """Prioritize evidence against actual MadProps plans; never infer prices.

    A candidate is only a lead, even if account size and a dollar sign match.
    Account variants, fees, and promotions require a dedicated verified adapter.
    """
    matches = []
    lines = details.get("candidateLines", [])
    for row in rows:
        if row.get("firm_key") != firm:
            continue
        raw_size = str(row.get("account_size_usd", "")).strip()
        if not raw_size.isdigit() or int(raw_size) % 1000:
            continue
        size_k = int(raw_size) // 1000
        token = re.compile(r"(?<!\\d)" + str(size_k) + r"\\s*[kK](?!\\w)")
        relevant = [line for line in lines if token.search(line)]
        matches.append({"key":row.get("key"), "accountLabel":row.get("account_label"),
                        "sizeUsd":raw_size, "candidateLines":relevant[:5],
                        "status":"REQUIRES_EXACT_PLAN_VERIFICATION"})
    return matches


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", type=Path, default=ROOT / "data/source-candidates.json")
    args = ap.parse_args()
    sheet_rows = list(csv.DictReader(io.StringIO(fetch(SHEET))))
    results = {}
    for firm, url in SOURCES.items():
        if firm in ADAPTERS:
            continue
        try:
            details = extract(fetch(url))
            results[firm] = {"url":url, "status":"REVIEW_ONLY", **details, "sheetPlanCandidates":match_sheet_rows(firm, details, sheet_rows)}
        except Exception as exc:
            results[firm] = {"url":url, "status":"FETCH_FAILED", "error":type(exc).__name__}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps({"notice":"Unverified candidates only. Never use for live pricing without exact plan and coupon validation.","firms":results},indent=2)+"\n")
    for firm, data in results.items():
        print(f"{firm}: {data['status']}, {len(data.get('candidateLines',[]))} price-bearing lines, {len(data.get('structuredOffers',[]))} offers")

if __name__ == "__main__":
    main()
