# Adapter Automation Assessment

Which remaining prop firms can have their pricing automated, and which can't.

## Currently Automated (7 adapters)

| Firm | Rows | Status |
|---|---|---|
| Apex | 16 | ✅ Adapter works (403-blocked intermittently) |
| Tradeify | 25 | ✅ Working |
| DayTraders | 18 | ✅ Working |
| Lucid | 16 | ✅ Adapter works (403-blocked intermittently) |
| Blue Guardian | 13 | ✅ Working |
| My Funded Futures | 13 | ✅ Working |
| TradeDay | 11 | ✅ Working |

## New Adapters Built This Round

| Firm | Rows | Data Source | Coverage |
|---|---|---|---|
| **FundedNext** | 15 | Next.js flight payload | 9 of 15 rows (Rapid Daily 3, Rapid Pro 3, Flex 3). DLL Add-On (3) and Legacy (3) are not on the storefront → review items. Uses MAD affiliate code. |
| **Top One Futures** | 15 | Webflow HTML pricing cards | All 15 rows. 4 plan types in tab panes (Elite, Elite Access, Instant Sim Funded, Ignite). Coupon code BOO/BOGO parsed from v2-copy-text elements. |

## Cannot Automate

| Firm | Rows | Reason |
|---|---|---|
| **AquaFutures** | 8 | Site prices in `window.AQ_TABLE_CONFIG` don't match Sheet labels reliably. Only 2 of 8 rows have approximate matches; 6 have large discrepancies. Label-to-config mapping is ambiguous. |
| **Bulenox** | 24 | React SPA — page is nearly empty without JS execution. No SSR pricing data. |
| **E8 Futures** | 10 | Cloudflare challenge blocks fetch. |
| **Phidias** | 10 | Cloudflare challenge blocks fetch. |
| **Elite Trader Funding** | 14 | 403 Forbidden — server rejects all non-browser requests. |
| **Funded Futures Plus** | 10 | Server connection times out. |
| **Alpha Futures** | 13 | JS SPA redirect → 403 on the actual lander page. |
| **Purdia** | 7 | Vue/React SPA shell; no pricing in static HTML. |
| **LegendsTrading** | 7 | No structured pricing data on page. None of the Sheet prices appear in the HTML. |
| **TakeProfitTrader** | 5 | Prices are scattered in marketing copy, not in parseable structures. |
| **Blusky Trading** | 15 | Has `skyData`/`skyData2` JS objects with plan configs but no direct prices — just plan parameters. |
| **TradersLaunch** | 6 | Only 3 Schema.org offers vs 6 Sheet rows (which include split variants). Incomplete mapping. |

## Summary

- **Total firms in Sheet:** 19
- **Automated (after this round):** 9 firms, covering ~127 of ~282 rows (45%)
- **Cannot automate:** 10 firms, 129 rows — blocked by Cloudflare/403s, JS SPAs, or no structured data
