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

## Workaround Round (Oct 2026)

Three techniques, all free and in-house, no proxies or IP rotation:

1. **Read the app bundle.** Single-page apps ship their plan tables inside one
   hashed script (`/assets/index-<hash>.js`). `fetch_source()` reads the page
   only to find that file name, then reads the script as text. Nothing runs.
2. **Browser fingerprint (`curl_cffi`).** Some Cloudflare-fronted sites answer
   a client that looks like Chrome. It's still one plain GET of the public page.
3. **Correct URLs.** Several "blocked" firms were just pointed at the wrong domain.

### Adapters added

| Firm | Rows | Technique | Notes |
|---|---|---|---|
| **Bulenox** | 24 | App bundle | **Regular price only.** Affiliates assemble their own Bulenox codes, so discount fields stay manual. A weekly reminder email covers the codes. A price change on a row with a fixed `discounted_eval_usd` goes to review. |
| **Phidias** | 10 | `curl_cffi` | `window.phidiasPromo`: one-time (`otp`) price plus `discounts.otp` %. MADPROPS is kept. |
| **Alpha Futures** | 13 | Correct URL (`alpha-futures.com`) | Webflow cards plus `data-discount-offers` (per-plan code and %). ALPHA40 isn't an affiliate code, so it's replaced by the site's code for that plan. |

### Reachable now, mapping still needed

| Firm | Rows | Finding |
|---|---|---|
| **Purdia** | 7 | Vue app bundle has `priceOriginal`/`priceMain`/`discountCode` per plan. Same technique as Bulenox. |
| **Funded Futures Network** | 10 | `www.fundedfuturesnetwork.com` loads via `curl_cffi`. `data-size-was` prices don't match the Sheet's MAX Standard rows, so confirm the plan first. |
| **Legends Trading** | 7 | `thelegendstrading.com/plans` has `data-card_old_price`/`data-card_coupon_code`. Tabs need mapping to Sheet labels. |
| **Elite Trader Funding** | 14 | Correct domain is `elitetraderfunding.app`. Prices sit on per-plan pages (Next.js). |
| **E8 Futures** | 10 | Homepage loads via `curl_cffi`. The Sheet's pricing URL returns 404, so the right pricing page is still needed. |
| **TakeProfitTrader** | 5 | Angular app. Prices come from its API or a rendered page. |

### Still blocked

| Firm | Rows | Reason / options |
|---|---|---|
| **Apex, Lucid** | 32 | Cloudflare 403 even with a browser fingerprint and headless Chromium. Options: a paid rendering service (ScrapingBee, ZenRows, Browserless) or a price feed from the firm's affiliate team. Adapters already exist, so whenever a fetch succeeds they work. |
| **AquaFutures, Blusky, TradersLaunch** | 29 | Data is reachable, but Sheet labels don't map cleanly (unchanged from the prior round). |
