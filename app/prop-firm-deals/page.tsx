import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import { FIRMS } from "@/lib/firms";

const SITE_URL = "https://www.madprops.com";
const CANONICAL_URL = `${SITE_URL}/prop-firm-deals`;

export const revalidate = 60 * 60 * 24; // daily

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Best Prop Firm Deals (Live Discounts & Payout Rules) | MadProps",
  description:
    "Compare live prop firm deals, instant funding discounts, payout rules, and platforms. Updated daily. Trade smarter with MadProps.",
  alternates: {
    canonical: CANONICAL_URL,
  },
  openGraph: {
    type: "website",
    url: CANONICAL_URL,
    title: "Best Prop Firm Deals (Live Discounts & Payout Rules) | MadProps",
    description:
      "Compare live prop firm deals, instant funding discounts, payout rules, and platforms. Updated daily.",
    siteName: "MadProps",
    images: [
      {
        url: "/og/madprops-og.png",
        width: 1200,
        height: 630,
        alt: "MadProps - Best Prop Firm Deals, Instant Funding, Reviews and Discounts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@madprops_io",
    creator: "@madprops_io",
    title: "Best Prop Firm Deals (Live Discounts & Payout Rules) | MadProps",
    description:
      "Compare live prop firm deals, instant funding discounts, payout rules, and platforms. Updated daily.",
    images: ["/og/madprops-og.png"],
  },
};

type DealFirm = {
  name: string;
  slug: string;
  dealSummary: string;
  payoutSummary: string;
  platforms: string[];
  bestFor: string;
};

const LOGO_BY_FIRM_KEY = new Map(FIRMS.map((firm) => [firm.key, firm.logo]));

type CsvRow = Record<string, string | undefined>;

const normalizeFirmKey = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const first = <T,>(...vals: Array<T | undefined | null>) =>
  vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "") as T | undefined;

const toArray = (v: string | undefined | null) =>
  v
    ? String(v)
        .split(/[|,/;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

function parseCsv(text: string): CsvRow[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = (lines[0] ?? "").replace(/^\uFEFF/, "");
  const header = headerLine.split(",").map((h) => h.trim());
  if (header.length === 0) return [];

  return lines.slice(1).map((line) => {
    const cols: string[] = [];
    let current = "";
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cols.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current);

    const row: CsvRow = {};
    header.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    return row;
  });
}

async function loadLivePlatformsByFirmKey(): Promise<Map<string, string[]>> {
  const csvUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL ?? process.env.SHEET_CSV_URL ?? "";
  if (!csvUrl) return new Map();

  try {
    const res = await fetch(csvUrl, { next: { revalidate } });
    if (!res.ok) return new Map();
    const csv = await res.text();
    const rows = parseCsv(csv);
    const map = new Map<string, Set<string>>();

    rows.forEach((r) => {
      const rawKey =
        first(
          r.firm_key,
          r["Firm Key"],
          r.key,
          r.Key,
          r.slug,
          r.Slug,
          r.name,
          r.Name,
          r.firm_name,
          r["Firm Name"]
        ) ?? "";

      const firmKey = normalizeFirmKey(String(rawKey));
      if (!firmKey) return;

      const platforms = toArray(
        first(r.platforms, r.Platforms, r.platform, r.Platform, r["Trading Platforms"]) ?? ""
      );
      if (platforms.length === 0) return;

      const existing = map.get(firmKey) ?? new Set<string>();
      platforms.forEach((p) => existing.add(p));
      map.set(firmKey, existing);
    });

    return new Map(Array.from(map.entries()).map(([k, set]) => [k, Array.from(set.values())]));
  } catch {
    return new Map();
  }
}

const BEST_DEALS_RIGHT_NOW: DealFirm[] = [
  {
    name: "Apex Trader Funding",
    slug: "apex",
    dealSummary: "Frequent evaluation promotions with discount depth varying by sale window and account size.",
    payoutSummary:
      "Payout eligibility depends on account type and current rules; always confirm requirements before purchase.",
    platforms: ["Rithmic", "NinjaTrader"],
    bestFor: "Futures traders seeking rotating discounts, maximum leverage via up to 20 funded accounts, and scalable stacking",
  },
  {
    name: "Elite Trader Funding (ETF)",
    slug: "elitetraderfunding",
    dealSummary:
      "Simple evaluation pricing with frequent promotions, including discounts as high as 90 percent on select accounts.",
    payoutSummary:
      "Payout eligibility depends on account type and program rules; confirm minimum days and thresholds before requesting a payout.",
    platforms: ["Rithmic"],
    bestFor: "Futures traders looking for a low-cost evaluation, straightforward rules, and aggressive promotional pricing",
  },
  {
    name: "Funded Futures Network (FFN)",
    slug: "fundedfutures",
    dealSummary:
      "Competitive evaluation pricing with periodic promotions, including frequent buy one get one offers depending on account size and campaign.",
    payoutSummary:
      "Payout eligibility depends on program rules and account type. Traders must meet minimum trading days and profit requirements before requesting a payout. Always verify current terms before purchasing.",
    platforms: ["Rithmic", "NinjaTrader"],
    bestFor: "Futures traders who value clear evaluation rules, simple payout requirements, and cost-saving promotions like buy one get one deals",
  },
];

const INSTANT_FUNDING_DEALS: DealFirm[] = [
  {
    name: "Lucid Trading",
    slug: "lucidtrading",
    dealSummary:
      "Trader friendly instant-style offerings with promotions that often appear around product updates and feature releases.",
    payoutSummary:
      "Payout eligibility, thresholds, and scaling rules vary by program; confirm current requirements before purchasing.",
    platforms: ["Rithmic"],
    bestFor: "Traders looking for instant-style funding with a modern platform experience and flexible program options",
  },
  {
    name: "Top One Futures",
    slug: "toponefutures",
    dealSummary:
      "Multiple program types including instant-style accounts, with promotions that vary by tier and account size.",
    payoutSummary:
      "Instant-style programs can have different payout access rules than evaluation accounts; always verify the specific terms before trading.",
    platforms: ["Rithmic"],
    bestFor: "Futures traders comparing instant funding versus evaluation paths under a single brand",
  },
  {
    name: "TradingFunds",
    slug: "tradingfunds",
    dealSummary:
      "Consistent promotional pricing with frequent opportunities to reduce entry cost depending on account type.",
    payoutSummary:
      "Traders must meet minimum trading day requirements and payout thresholds; processing timelines can vary by program.",
    platforms: ["Rithmic"],
    bestFor: "Traders who want simple rules, frequent pricing opportunities, and a straightforward instant funding structure",
  },
];

const ONE_DAY_PAYOUT_ELIGIBLE: DealFirm[] = [
  {
    name: "TradeDay",
    slug: "tradeday",
    dealSummary: "Pricing is generally stable, with promotions appearing periodically rather than on a constant rotation.",
    payoutSummary:
      "Some TradeDay account types advertise payout eligibility from day one. Minimum profit thresholds and account-specific conditions still apply, so always verify the latest requirements.",
    platforms: [],
    bestFor: "Futures traders who prioritize early payout access, transparent rules, and platform flexibility",
  },
  {
    name: "Take Profit Trader (TPT)",
    slug: "tpt",
    dealSummary: "Often competes on simple and accessible pricing, with promotions and reset discounts available during select periods.",
    payoutSummary:
      "Payout eligibility depends on account type, minimum trading days, and consistency requirements. Confirm current rules before trading for payout.",
    platforms: ["NinjaTrader"],
    bestFor: "Futures traders who want a straightforward evaluation process with clearly defined payout expectations",
  },
  {
    name: "Tradeify",
    slug: "tradeify",
    dealSummary:
      "Offers multiple program types including instant-style accounts that can reduce time to payout depending on the option selected.",
    payoutSummary:
      "Early payout access varies by program. Traders must meet profit targets, timing requirements, and account-specific conditions to qualify.",
    platforms: ["MT5", "cTrader"],
    bestFor: "Traders comparing instant versus evaluation payout access across multiple platforms and program structures",
  },
];

const CHEAPEST_EVALUATIONS: DealFirm[] = [
  {
    name: "Blue Guardian Futures",
    slug: "blueguardian",
    dealSummary: "Frequent discount drops can significantly reduce evaluation cost when promotions are live.",
    payoutSummary: "Confirm payout schedule, profit thresholds, and any accelerated payout conditions before trading for payout.",
    platforms: ["Rithmic", "NinjaTrader"],
    bestFor: "Traders watching sale windows who want a low entry evaluation with a clean and easy to use dashboard",
  },
  {
    name: "FundedNext Futures",
    slug: "fundednextfutures",
    dealSummary: "Regular promotions across evaluation and funded account types with pricing that changes by campaign.",
    payoutSummary:
      "Rapid accounts do not require a profit buffer before first payout. Traders can request payouts once profit and consistency requirements are met. Rules may vary by account type.",
    platforms: ["Rithmic"],
    bestFor:
      "Futures traders who want low evaluation pricing combined with faster payout access, no buffer requirement, and a modern account structure",
  },
  {
    name: "Aqua Futures",
    slug: "aquafutures",
    dealSummary: "Can be competitively priced when discounts are active. Compare pricing carefully across account sizes.",
    payoutSummary:
      "Review drawdown mechanics and payout thresholds closely, as lower cost evaluations can come with tighter risk rules.",
    platforms: ["Rithmic"],
    bestFor: "Traders prioritizing low entry pricing who are comfortable managing stricter drawdown rules in futures focused programs",
  },
];

function uniqueFirms(...groups: DealFirm[]) {
  const map = new Map<string, DealFirm>();
  groups.forEach((firm) => {
    if (!map.has(firm.slug)) map.set(firm.slug, firm);
  });
  return Array.from(map.values());
}

function buildFirmUrl(slug: string) {
  return `/firms/${slug}`;
}

function getFirmLogoSrc(firmKey: string) {
  return LOGO_BY_FIRM_KEY.get(firmKey) ?? `/logos/${firmKey}.png`;
}

function Section({
  id,
  title,
  intro,
  firms,
  platformsByFirmKey,
}: {
  id: string;
  title: string;
  intro: string;
  firms: DealFirm[];
  platformsByFirmKey: Map<string, string[]>;
}) {
  return (
    <section id={id} className="border-t border-white/10 pt-8">
      <h2 className="text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm text-white/70 md:text-base">{intro}</p>

      <div className="mt-6 grid gap-4">
        {firms.map((firm) => {
          const livePlatforms =
            platformsByFirmKey.get(normalizeFirmKey(firm.slug)) ?? firm.platforms;
          return (
          <article
            key={`${id}-${firm.slug}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <Image
                      src={getFirmLogoSrc(firm.slug)}
                      alt={`${firm.name} logo`}
                      width={40}
                      height={40}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-white md:text-xl">{firm.name}</h3>
                </div>
                <p className="mt-2 text-sm text-white/70 md:text-base">
                  <span className="font-semibold text-white">Deal:</span> {firm.dealSummary}
                </p>
                <p className="mt-2 text-sm text-white/70 md:text-base">
                  <span className="font-semibold text-white">Payout rules:</span> {firm.payoutSummary}
                </p>
                <p className="mt-2 text-sm text-white/70 md:text-base">
                  <span className="font-semibold text-white">Best for:</span> {firm.bestFor}
                </p>
              </div>

              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/80">
                  Platforms
                </p>
                <p className="mt-2 text-sm text-white/70">
                  {livePlatforms.length > 0 ? livePlatforms.join(" / ") : "See firm profile"}
                </p>
                <Link
                  href={buildFirmUrl(firm.slug)}
                  className="mt-4 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  View {firm.name} deal details &rarr;
                </Link>
              </div>
            </div>
          </article>
        );
        })}
      </div>
    </section>
  );
}

export default async function PropFirmDealsPage() {
  const platformsByFirmKey = await loadLivePlatformsByFirmKey();
  const allUnique = uniqueFirms(
    ...BEST_DEALS_RIGHT_NOW,
    ...INSTANT_FUNDING_DEALS,
    ...ONE_DAY_PAYOUT_ELIGIBLE,
    ...CHEAPEST_EVALUATIONS
  );

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MadProps",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: ["https://x.com/MadProps"],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${CANONICAL_URL}#itemlist`,
    name: "Prop firm deals list (sample firms)",
    itemListElement: allUnique.map((firm, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Organization",
        name: firm.name,
        url: `${SITE_URL}${buildFirmUrl(firm.slug)}`,
      },
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${CANONICAL_URL}#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: "Are prop firm deals legit?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Some prop firm deals are legitimate discounts on evaluations, activation fees, or resets, but the terms matter. Always verify the promo in the firm's checkout, read the latest rulebook, and confirm whether any restrictions (payout thresholds, minimum days, or special add-ons) apply.",
        },
      },
      {
        "@type": "Question",
        name: "Which prop firm pays out the fastest?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Fast payouts depend on the specific program (instant funding vs evaluation), the firm's payout calendar, and your account meeting eligibility rules. The fastest options are usually programs that allow early payout requests after a short eligibility window, but you should compare the exact payout schedule and requirements on each firm profile.",
        },
      },
      {
        "@type": "Question",
        name: "Do prop firm discounts affect payouts?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "A discount should not change your payout split by itself, but some promos bundle different account types or add-ons that do change rules. Confirm the exact product you are buying, then compare payout eligibility, payout frequency, and any thresholds on the firm’s official terms before you commit.",
        },
      },
      {
        "@type": "Question",
        name: "Are futures prop firm deals better than forex?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Neither is universally better. Futures prop firms often run aggressive sales, but they may have different drawdown mechanics and payout thresholds. Forex-style firms may have more platform choice but different risk and payout policies. The best choice depends on your market, platform needs, and how the rules match your trading style.",
        },
      },
    ],
  };

  return (
    <>
      <Script
        id="prop-firm-deals-org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Script
        id="prop-firm-deals-itemlist-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Script
        id="prop-firm-deals-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="min-h-screen bg-gradient-to-b from-[#040912] via-[#02050a] to-[#010307] text-white">
        <header className="border-b border-white/5 bg-gradient-to-br from-[#050a16] via-[#040a18] to-[#030712]">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-emerald-300/80">
              Deals / Discounts
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Best Prop Firm Deals &amp; Discounts (Updated Daily)
            </h1>
            <p className="max-w-3xl text-sm text-white/70 md:text-base">
              MadProps tracks <strong>prop firm deals</strong> and organizes them by what traders
              actually care about: price after discounts, payout eligibility, and platform support.
              Use this page to spot the best offers fast, then confirm details on each firm.
            </p>
            <p className="max-w-3xl text-sm text-white/70 md:text-base">
              Want the full dataset? Browse the{" "}
              <Link href="/firms" className="text-emerald-300 underline-offset-4 hover:underline">
                prop firm deals directory
              </Link>
              , learn the basics in{" "}
              <Link href="/learn" className="text-emerald-300 underline-offset-4 hover:underline">
                our prop firm guides
              </Link>
              , or{" "}
              <Link href="/compare" className="text-emerald-300 underline-offset-4 hover:underline">
                compare prop firm deals side by side
              </Link>
              .
            </p>
            <p className="text-xs text-white/50">
              Disclosure: Some outbound links on MadProps may be affiliate links. Rules and promos
              can change quickly—always verify on the firm’s official site.
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1100px] px-4 py-10 space-y-10">
          <Section
            id="best-prop-firm-deals"
            title="Best Prop Firm Deals Right Now"
            intro="These are examples of firms that frequently run promotions or offer strong effective pricing. Replace this array with your live MadProps firm feed when ready."
            firms={BEST_DEALS_RIGHT_NOW}
            platformsByFirmKey={platformsByFirmKey}
          />

          <Section
            id="instant-funding-prop-firm-deals"
            title="Instant Funding Prop Firm Deals"
            intro="Instant funding can reduce time-to-funded, but rules and payout eligibility vary a lot by program. Use MadProps to compare instant funding prop firms by payout access, platforms, and true cost."
            firms={INSTANT_FUNDING_DEALS}
            platformsByFirmKey={platformsByFirmKey}
          />

          <Section
            id="one-day-payout-eligible-firms"
            title="One-Day Payout Eligible Firms"
            intro="Some programs advertise payout eligibility from day one (or very early). Verify requirements like minimum trading days, profit thresholds, and whether rules differ by account type."
            firms={ONE_DAY_PAYOUT_ELIGIBLE}
            platformsByFirmKey={platformsByFirmKey}
          />

          <Section
            id="cheapest-prop-firm-evaluations"
            title="Cheapest Prop Firm Evaluations"
            intro="Low sticker price isn’t always low true cost—resets, activation fees, and drawdown rules can change the math. These examples highlight the type of firms traders compare when optimizing for cheap evaluations."
            firms={CHEAPEST_EVALUATIONS}
            platformsByFirmKey={platformsByFirmKey}
          />

          <section id="faq" className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-semibold text-white md:text-3xl">FAQ</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">Are prop firm deals legit?</h3>
                <p className="mt-2 text-sm text-white/70 md:text-base">
                  Some <strong>prop firm deals</strong> are legitimate discounts on evaluations,
                  activation fees, or resets, but the terms matter. Verify the promo in the firm’s
                  checkout, read the latest rulebook, and confirm whether any restrictions apply.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">Which prop firm pays out the fastest?</h3>
                <p className="mt-2 text-sm text-white/70 md:text-base">
                  Fast payouts depend on the program type, payout calendar, and eligibility rules.
                  The fastest options are typically <strong>instant funding prop firms</strong> or
                  programs with short payout windows, but you should compare the exact schedule and
                  requirements on each firm profile.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">Do prop firm discounts affect payouts?</h3>
                <p className="mt-2 text-sm text-white/70 md:text-base">
                  A discount shouldn’t change your payout split by itself, but some promos bundle
                  different account types or add-ons that can change rules. Confirm the exact
                  product, then compare payout eligibility and thresholds before you buy.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">
                  Are futures prop firm deals better than forex?
                </h3>
                <p className="mt-2 text-sm text-white/70 md:text-base">
                  Neither is universally better. Futures deals can be aggressive, but drawdown
                  mechanics and payout thresholds differ. Forex-style firms may offer more platform
                  choice with different risk and payout policies. Choose based on your market and
                  how the rules match your trading style.
                </p>
              </article>
            </div>

            <p className="mt-6 text-sm text-white/60">
              Next: Compare{" "}
              <Link href="/compare" className="text-emerald-300 hover:text-emerald-200">
                prop firm deals side by side
              </Link>
              , explore{" "}
              <Link href="/firms" className="text-emerald-300 hover:text-emerald-200">
                the best prop firm discounts
              </Link>
              , or learn how evaluations and payouts work in{" "}
              <Link href="/learn" className="text-emerald-300 hover:text-emerald-200">
                our prop firm education hub
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
