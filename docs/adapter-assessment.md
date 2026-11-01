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
| **Legends Trading** | 7 | Public JSON API | `api.thelegendstrading.com/shop/plans` (what the storefront loads): `price` = regular, `strikeThroughPrice` = sale, `activeCoupon` = code. The % is derived and must be a whole number, otherwise the coupon is held. |
| **Funded Futures Network** | 10 | `curl_cffi` | `plans-data` JSON (`tier` "$50K STEADY Account", one-time `price`). Coupons come per data feed (`data-coupon-platforms`). Per TJ (Nov 1 2026) the **best** valid percentage is used (NEXUS 70% on CQG vs 50% on Rithmic, so 70% is shown, CQG-only). Held if a valid offer is not a percentage or different codes tie for best. Prices are platform-independent (both feed discounts are computed from the same price). |
| **Purdia** | 7 | App bundle (`BUNDLE_FETCH`) | Per TJ (Nov 1 2026) the TRY60 accounts catalogue is used, not the October homepage list (OCT50). The adapter finds the catalogue mapper (sets `discountCode`, prices cards at `priceOriginal * .4`), reads the code and the multiplier from it (60%), and matches cards by slug whose checkout link carries that code. Card top-level `priceOriginal` is the default (buffer-rule) price; EOD prices are first-month subscription prices. Nov 1 2026 dry run: Instant 249/449/699, Pioneer 849, EOD 179/299, all TRY60 60%. **Pro Evaluation is not in the TRY60 catalogue, so it goes to review.** |
| **E8 Futures** | 10 | Nuxt payload (`__NUXT_DATA__`) | `e8markets.com/e8-markets-discount-code` (plain fetch) ships `global-data.products`. Futures plans are `e8signature_v_fu`, `e8zero_max_fu` and `e8zero_start_fu`, each with `balances[size].price`, `discount`/`firstDiscount` and `discountCode`. The payload is decoded by index only, never evaluated. The coupon is held if first-purchase and regular % differ, and a tier-price disagreement fails closed. Nov 1 2026 dry run: Zero MAX unchanged. Signature 120/170/280/450 (Sheet 110/150/260/390). Zero Starter 50K/100K 218/338 (Sheet 178/278). The site has no Zero Starter 200K, so that row goes to review. |

### Adapters added (Oct 31 2026 round)

All four read public pages (or a public same-origin JSON endpoint) with a plain
fetch. Nothing is executed. Live dry run on Oct 31 2026 against the live Sheet:
**23 verified patches, 0 changed cells, 14 review items.**

| Firm | Rows | Source | Notes |
|---|---|---|---|
| **BluSky Trading** | 15 | Inline `const skyData` table on `blusky.pro` | Each plan is `"<size>": {"<mode>": mkPlanSky({...})}` (`launch` = Launch, `premium` = Propel, `orbit` = Orbit, `instant` = Instant Funding). The single flat argument is unwrapped to a literal and parsed with json5. `price` is the charge, `was` the regular price, `discount: "USE CODE: X"` the code, and `atLaunch` the activation fee. A "Static" Sheet label must match a static evaluation drawdown, and vice versa. Propel: regular price, 30OFF and 30% verified. Orbit and Instant: plain price, verified because the Sheet has no discount. **Launch (3 rows): the Sheet says 50% with no code and the site shows no discount, so pricing goes to review.** The activation fee is still published. |
| **Take Profit Trader** | 5 | Homepage + public API `takeprofittrader.com/accounts/api/subscriptions` (`COMPANION_JSON`) | `fetch_source` appends the API JSON to the homepage as an inert `madprops-companion` JSON block. Test accounts are items `"$ 25k"` with `balance` equal to the size, `marketType` 0 and a positive `price`; free PRO+ entries are ignored. The coupon is verified only when the homepage promo banner names exactly one `% Off` and one `Use Code:` and the API has no `discountPrice`. Live: 150/170/245/330/360, NOFEE40 40%, all 5 verified and unchanged. |
| **Traders Launch** | 15 | Server-rendered cards + `/api/trading-providers/offers` JSON | Three plan families: **Standard/Premium 80%** (3 rows) from server-rendered `<article>` cards matched by checkout link (`hours=2`); **Legacy NYC 80%** (3 rows) from cards with `· Legacy NYC` subtitle and `hours=1`; **Static 60/80/90%** (9 rows) from the companion JSON offers API (`productProgram == "static"`). Static plans that are sold out fail closed. A card showing more than one dollar amount (a sale) also fails closed. `Premium` is accepted as an alias for `Standard`. |
| **Aqua Futures** | 8 | Inline `window.AQ_TABLE_CONFIG` on `aquafutures.io` | `futures[model][type].platforms[platform].prices['50k']`. Every platform (Tradovate, DeepCharts) must agree, and the size must be in `availableAccounts`. Mapping: Beginner = One Step / beginner, Standard = Daily / standard, Flex = One Step / flex, Instant Standard = Instant / standard. The site shows `Math.floor` of the list price, and that value is used. **Per TJ (Nov 1 2026) the BACK2WORK code is removed.** The site applies a code-less 35% bulk discount (`bulkDiscount.futures`) to all futures plans automatically. The adapter verifies the percentage and clears the code (`discount_code` = ""; a MAD/MADPROPS Sheet code would be kept). It sets `discount_pct` to the percentage and clears `discounted_eval_usd` so the percentage sets the price. If `bulkDiscount.futures` is missing, zero or not a whole number from 1 to 100, pricing goes to review. **Beginner plans are hidden** (`hiddenTypes` hides One Step / beginner), so those 2 rows fail closed. Site list prices (Oct 31 page) that will replace the Sheet values: Standard 121/186 (Sheet 120/200), Flex 141/205 (Sheet 106/173), Instant Standard 487/646 (Sheet 328/408). |

### Checked Oct 31 2026, not automated (fail closed)

| Firm | Rows | Finding |
|---|---|---|
| **Elite Trader Funding** | 14 | `elitetraderfunding.app` pages (`/evaluations`, `/1-step-evaluation`, `/direct-to-funded`, ...) carry no plan prices in the HTML, the flight payload, the static JS chunks, or even the fully rendered page (Playwright, Nov 1 2026). The only public API calls are feature flags and session. Prices appear only in checkout, which requires sign-in. **Re-checked Oct 31 2026:** the homepage and `/evaluations` now show a comparison table, but it only has "As Low As" activation and reset fees ($47/$87 monthly, $157/$177/$307 one-time), not per-plan evaluation prices. `elitetraderfunding.com` returns 403. It stays manual and no adapter was added. |

### Still blocked

| Firm | Rows | Reason / options |
|---|---|---|
| **Apex, Lucid** | 32 | Cloudflare 403 even with a browser fingerprint and headless Chromium. Options: a paid rendering service (ScrapingBee, ZenRows, Browserless) or a price feed from the firm's affiliate team. Adapters already exist, so whenever a fetch succeeds they work. |
