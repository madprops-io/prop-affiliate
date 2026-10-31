# Synthetic adapter fixtures

**These files are NOT real pricing data.** They are hand-written test inputs
for `test_collect.py`. Each one copies only the JavaScript variable *shape*
that an adapter in `collect.py` parses (`tradeify()`, `daytraders()`,
`apex()`, `lucid()`). They were not scraped or copied from any firm website.

- Prices are obviously fake (999, 888, 777, 666).
- Coupon codes are obviously fake (`TESTCODE`, `FAKEPROMO`).
- Dates are fixed in 2026 so the tests don't depend on the real clock.

Never use these values in the Sheet, `data/firm-updates.json`, or
`data/approved-firm-data.json`. Don't pass this directory to
`collect.py --fixtures` either, because it has no `sheet.csv`.
