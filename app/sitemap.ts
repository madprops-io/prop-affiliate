import type { MetadataRoute } from "next";

const baseUrl = "https://www.madprops.com";
const now = new Date();

const dailyRoutes = [
  "/",
  "/score-cards",
  "/firms",
  "/calendar",
  "/disclosure",
  "/links",
  "/learn",
  "/best-prop-firms",
  "/best-prop-firms/day-one-payouts",
  "/best-prop-firms/no-consistency-rule",
  "/best-prop-firms/news-trading",
];

const weeklyRoutes = [
  "/learn/what-is-a-prop-firm",
  "/learn/day-one-payouts-explained",
  "/prop-firm/alpha-futures",
  "/prop-firm/apex-trader-funding",
  "/prop-firm/aqua-futures",
  "/prop-firm/blue-guardian-futures",
  "/prop-firm/bulenox",
  "/prop-firm/daytraders-com",
  "/prop-firm/e8-futures",
  "/prop-firm/elite-trader-funding",
  "/prop-firm/funded-futures-network",
  "/prop-firm/fundednext-futures",
  "/prop-firm/funderpro",
  "/prop-firm/legends-trading",
  "/prop-firm/lucid-trading",
  "/prop-firm/my-funded-futures",
  "/prop-firm/phidias-propfirm",
  "/prop-firm/purdia-capital",
  "/prop-firm/take-profit-trader",
  "/prop-firm/top-one-futures",
  "/prop-firm/trade-day",
  "/prop-firm/tradeify",
  "/prop-firm/tradingfunds",
];

const priorities: Record<string, number> = {
  "/": 1.0,
  "/best-prop-firms": 0.9,
  "/best-prop-firms/day-one-payouts": 0.9,
  "/best-prop-firms/no-consistency-rule": 0.9,
  "/best-prop-firms/news-trading": 0.9,
  "/score-cards": 0.8,
  "/firms": 0.8,
  "/calendar": 0.8,
  "/disclosure": 0.8,
  "/links": 0.8,
  "/learn": 0.8,
};

const weeklyPriority = 0.7;

export default function sitemap(): MetadataRoute.Sitemap {
  const dailyEntries = dailyRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: priorities[route] ?? 0.8,
  }));

  const weeklyEntries = weeklyRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: weeklyPriority,
  }));

  return [...dailyEntries, ...weeklyEntries];
}
