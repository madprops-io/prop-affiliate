// app/coming-soon/page.tsx
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MadProps — Coming Soon",
  description:
    "We’re building a fast, transparent directory of futures prop firms: payouts, rules, fees, platforms, and real perks — all in one place.",
  openGraph: {
    title: "MadProps — Coming Soon",
    description:
      "We’re building a fast, transparent directory of futures prop firms: payouts, rules, fees, platforms, and real perks — all in one place.",
    images: [{ url: "/og/madprops-og.png", width: 1200, height: 630, alt: "MadProps" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MadProps — Coming Soon",
    images: ["/og/madprops-og.png"],
  },
};

type PartnerStatus = "affiliate" | "pending";
type Partner = {
  name: string;
  blurb: string;
  href: string;
  logo: string;
  status: PartnerStatus;
};

export default function ComingSoon() {
  const livePartners: Partner[] = [
    { name: "Lucid Trading", blurb: "Pick your path. Direct funded or eval. Use code MAD.", href: "https://lucidtrading.com/ref/madprops/", logo: "/logos/lucid.png", status: "affiliate" },
    { name: "Elite Trader Funding", blurb: "Flexible evaluations & resets.", href: "https://elitetraderfunding.app/evaluations?ref=MadProps", logo: "/logos/etf.png", status: "affiliate" },
    { name: "Funded Futures Network (FFN)", blurb: "Standard & Express evaluations. Use code MAD", href: "https://www.fundedfuturesnetwork.com/?via=madprops", logo: "/logos/ffn.png", status: "affiliate" },
    { name: "Trade Day", blurb: "Professional platform; daily payouts. Use code MAD", href: "https://www.tradeday.com/", logo: "/logos/tradeday.png", status: "pending" },
    { name: "Bulenox", blurb: "Simple rules, top customer service. Use Code MAD at checkout.", href: "https://bulenox.com/member/aff/go/tjcaldwell", logo: "/logos/bulenox.png", status: "affiliate" },
    { name: "FundingTicks", blurb: "Modern futures prop; clean UI.", href: "https://app.fundingticks.com/register?ref=ELPASO/", logo: "/logos/fundingticks.png", status: "affiliate" },
    { name: "Top One Futures", blurb: "Simple one-phase futures evaluations.", href: "https://toponefutures.com/?linkId=lp_707970&sourceId=mad&tenantId=toponefutures", logo: "/logos/topone.png", status: "affiliate" },
    { name: "TradingFunds", blurb: "Straightforward rules & pricing.", href: "https://tradingfunds.com/aff/1125/", logo: "/logos/tradingfunds.webp", status: "affiliate" },
    { name: "FunderPro", blurb: "Popular evaluation paths. Use code MADPROPS", href: "https://funderpro.cxclick.com/visit/?bta=44803&brand=funderpro  ", logo: "/logos/funderpro.png", status: "affiliate" },
    { name: "Blue Guardian Futures", blurb: "Competitive pricing; clean UX.", href: "https://checkout.blueguardianfutures.com/ref/885/", logo: "/logos/blueguardian.png", status: "affiliate" },
    { name: "Daytraders", blurb: "Trail, Static & S2F programs. Free data.", href: "https://daytraders.com/go/madprops?c=HGRCNLZU", logo: "/logos/daytraders.png", status: "affiliate" },
  ];

  const comingSoon: Partner[] = [
    { name: "Take Profit Trader", blurb: "Daily payouts. Straight to funded options.", href: "https://takeprofittrader.com/", logo: "/logos/tpt.png", status: "pending" },
    { name: "Apex Trader Funding", blurb: "Large community & frequent promos.", href: "https://apextraderfunding.com/", logo: "/logos/apex.png", status: "pending" },
    { name: "Tradeify", blurb: "Simple pricing tiers.", href: "https://tradeify.co/", logo: "/logos/tradeify.png", status: "pending" },
    { name: "FundedNext Futures", blurb: "Global brand; futures program.", href: "https://fundednext.com/futures", logo: "/logos/fundednext.png", status: "pending" },
    { name: "My Funded Futures", blurb: "Clean 1-phase futures model.", href: "https://myfundedfutures.com", logo: "/logos/mff.png", status: "pending" },
    { name: "Legends Trading", blurb: "Education-forward approach.", href: "https://thelegendstrading.com/", logo: "/logos/legends.png", status: "pending" },
    { name: "AquaFutures", blurb: "Newer player; competitive fees.", href: "https://www.aquafutures.io/", logo: "/logos/aqua.png", status: "pending" },
    { name: "E8 Futures", blurb: "Trusted brand branching to futures.", href: "https://e8markets.com/", logo: "/logos/e8.png", status: "pending" },
    { name: "Phidias Propfirm", blurb: "Emerging prop — details soon.", href: "https://phidiaspropfirm.com/", logo: "/logos/phidias.png", status: "pending" },
  ];

  const getCtaText = (status: PartnerStatus) =>
    status === "affiliate" ? "Get started" : "View site";

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0a0f1a] text-white">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-96 w-[80rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 via-teal-400/20 to-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* header (brand only — no nav) */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex select-none items-center gap-3">
          <div className="leading-tight">
            <span className="block text-xl font-semibold tracking-tight md:text-2xl bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              MadProps
            </span>
            <span className="block text-[12px] italic text-amber-300 md:text-sm">
              Trade smarter.
            </span>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto mt-2 flex w-full max-w-6xl flex-col items-center px-6 text-center">
        <p className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
          Futures Prop Firm Comparison • Launching soon
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          The cleanest way to{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            compare prop firms
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-balance text-white/70">
          We’re building a fast, transparent directory of futures prop firms: payouts, rules, fees,
          platforms, and real perks, all in one place.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <a
            id="notify"
            href="mailto:tj@madprops.io?subject=Notify%20me%20when%20MadProps%20launches&body=Hey%20TJ%2C%20add%20me%20to%20the%20launch%20list!"
            className="rounded-2xl px-5 py-3 text-sm font-medium text-[#0a0f1a] shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02]"
            style={{ background: "linear-gradient(90deg,#34d399,#22d3ee)" }}
          >
            Get launch email
          </a>
          <a
            href="#partners"
            className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-medium text-white/90 hover:bg-white/5"
          >
            Check partner deals
          </a>
        </div>

        {/* Follow on X */}
        <div className="mt-6">
          <a
            href="https://x.com/madprops_io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M18.244 3H21l-6.52 7.455L22.5 21h-5.777l-4.4-5.274L6.2 21H3.444l7.02-8.03L1.5 3h5.83l3.97 4.79L18.244 3zm-2.02 16.2h1.6l-10.2-12.4H5.9l10.324 12.4z"/>
            </svg>
            <span>
              Follow <span className="text-emerald-300">@madprops_io</span>
            </span>
          </a>
        </div>

        {/* small ETA card */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          <span className="font-medium text-white">ETA:</span> Public beta rolls out shortly. Want early access? Email{" "}
          <a className="underline" href="mailto:tj@madprops.io">tj@madprops.io</a>.
        </div>
      </section>

      {/* partners */}
      <section id="partners" className="mx-auto mt-12 w-full max-w-6xl px-6">
        <h2 className="text-left text-2xl font-semibold tracking-tight md:text-3xl">Live Partners</h2>
        <p className="mt-2 text-white/70">These links support MadProps, thanks for using them if you sign up.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {livePartners.map((a) => (
            <a
              key={a.name}
              href={a.href}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-400/40 hover:bg-white/10"
              aria-label={`Open ${a.name}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="self-start">
                    <Logo src={a.logo} alt={a.name} size={56} />
                  </div>
                  <div>
                    <h3 className="text-lg leading-tight font-semibold group-hover:text-white">{a.name}</h3>
                    <p className="mt-1 text-sm text-white/70">{a.blurb}</p>
                  </div>
                </div>

                {/* Badge */}
                <span className="mt-1 inline-flex shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  Affiliate
                </span>
              </div>

              {/* CTA */}
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-300">
                <span>{getCtaText(a.status)}</span>
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M5 10h8.586l-3.293 3.293a1 1 0 1 0 1.414 1.414l5-5a1 1 0 0 0 0-1.414l-5-5A1 1 0 1 0 9.293 4.707L12.586 8H5a1 1 0 1 0 0 2z" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        <h3 className="mt-12 text-left text-xl font-semibold tracking-tight md:text-2xl">More Firms Featured</h3>
        <p className="mt-2 text-white/60">We’re adding more verified firms and offers, check back soon.</p>

<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {comingSoon.map((a) => (
    <a
      key={a.name}
      href={a.href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
      aria-label={`Open ${a.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="self-start">
            <Logo src={a.logo} alt={a.name} size={56} />
          </div>
          <div>
            <h3 className="text-lg leading-tight font-semibold group-hover:text-white">
              {a.name}
            </h3>
            <p className="mt-1 text-sm text-white/70">{a.blurb}</p>
          </div>
        </div>
        {/* Label changed to neutral “Listed” */}
        <span className="mt-1 inline-flex shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
          Listed
        </span>
      </div>

      {/* ✅ Button now says “Visit site” for non-affiliates */}
      <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/70">
        <span>Visit site</span>
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M5 10h8.586l-3.293 3.293a1 1 0 101.414 1.414l5-5a1 1 0 000-1.414l-5-5A1 1 0 109.293 4.707L12.586 8H5a1 1 0 100 2z" />
        </svg>
      </div>
    </a>
  ))}
</div>

        {/* disclaimer */}
        <p className="mt-10 text-xs leading-relaxed text-white/50">
          Disclaimer: Trading futures involves substantial risk of loss and is not suitable for all investors.
          Nothing here is financial advice. By using partner links you may support MadProps at no extra cost.
        </p>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/60">
          Questions? Email <a href="mailto:tj@madprops.io" className="underline">tj@madprops.io</a>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/20 py-6 text-center text-sm text-white/60">
        © {new Date().getFullYear()} MadProps. All rights reserved.
      </footer>
    </main>
  );
}
