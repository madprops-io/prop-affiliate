"""Diagnostic-only website access check; NEVER updates prices.

A successful HTTP fetch is not proof of valid or current pricing.
"""
import concurrent.futures
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

SITES = {
 "fundednext": "https://fundednext.com/",
 "fundedfutures": "https://fundedfutures.com/",
 "blusky-trading": "https://blusky.pro/",
 "alphafutures": "https://alphafutures.com/",
 "purdia": "https://purdia.com/",
 "takeprofittrader": "https://takeprofittrader.com/",
 "bulenox": "https://bulenox.com/",
 "elite-trader-funding": "https://elitetraderfunding.com/",
 "top-one-futures": "https://toponefutures.com/",
 "tradeday": "https://tradeday.com/",
 "blue-guardian": "https://blueguardian.com/",
 "legendstrading": "https://legendstrading.com/",
 "my-funded-futures": "https://myfundedfutures.com/",
 "phidias": "https://phidiaspropfirm.com/",
 "aquafutures": "https://aquafutures.io/",
 "e8futures": "https://e8markets.com/",
 "traderslaunch": "https://traderslaunch.com/",
 "apex": "https://apextraderfunding.com/",
 "lucid": "https://lucidtrading.com/",
}
def probe(item):
    name, url = item
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; MadPropsDataMonitor/1.0; +https://madprops.com)", "Accept": "text/html,application/xhtml+xml"})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = resp.read(120000)
            return {"firm":name,"url":url,"status":resp.status,"finalUrl":resp.url,"bytesSampled":len(data),"result":"FETCHED (pricing unverified)"}
    except urllib.error.HTTPError as exc:
        return {"firm":name,"url":url,"status":exc.code,"result":"HTTP ERROR"}
    except Exception as exc:
        return {"firm":name,"url":url,"result":"FETCH ERROR","error":type(exc).__name__}

def main():
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = sorted(pool.map(probe, SITES.items()), key=lambda x:x["firm"])
    out = {"checkedAt":datetime.now(timezone.utc).isoformat(),"note":"Diagnostic only; candidate URLs may be wrong. HTTP 200 does not validate prices.","results":results}
    path=Path("data/source-access-audit.json")
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(out,indent=2)+"\n")
    lines=["## MadProps source access audit","", "**Diagnostic only: no prices or coupons changed.**","", "| Firm | HTTP | Result | Tested URL |","|---|---|---|---|"]
    for r in results:
        lines.append(f"| {r['firm']} | {r.get('status','—')} | {r['result']} | {r['url']} |")
    summary="\n".join(lines)+"\n"
    print(summary)
    import os
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"],"a") as f:f.write(summary)

if __name__=="__main__":
    main()
