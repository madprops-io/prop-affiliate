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

### Checked Oct 31 2026, not automated (fail closed)

| Firm | Rows | Finding |
|---|---|---|
| **Elite Trader Funding** | 14 | `elitetraderfunding.app` pages (`/evaluations`, `/1-step-evaluation`, `/direct-to-funded`, ...) carry no plan prices in the HTML, the flight payload, the static JS chunks, or even the fully rendered page (Playwright, Nov 1 2026). The only public API calls are feature flags and session. Prices appear only in checkout, which requires sign-in. Not automatable without an account, so it stays manual. |

### Reachable now, mapping still needed

| Firm | Rows | Finding |
|---|---|---|
| **TakeProfitTrader** | 5 | Angular app. Prices come from its API or a rendered page. |

### Still blocked

| Firm | Rows | Reason / options |
|---|---|---|
| **Apex, Lucid** | 32 | Cloudflare 403 even with a browser fingerprint and headless Chromium. Options: a paid rendering service (ScrapingBee, ZenRows, Browserless) or a price feed from the firm's affiliate team. Adapters already exist, so whenever a fetch succeeds they work. |
| **AquaFutures, Blusky, TradersLaunch** | 29 | Data is reachable, but Sheet labels don't map cleanly (unchanged from the prior round). |
