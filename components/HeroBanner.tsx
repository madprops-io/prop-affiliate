"use client";

const STATS = [
  { label: "Firms tracked", value: "21 live" },
  { label: "Evaluation accounts", value: "150+ programs" },
  { label: "Filters", value: "Platforms, payouts, rules, trustpilot" },
  { label: "Fresh data", value: "Updated daily with new rules & firms" },
];

export default function HeroBanner() {
  return (
    <section className="relative isolate w-full overflow-hidden bg-gradient-to-br from-[#050b16] via-[#050f1e] to-[#041322] py-16 md:py-20">
      <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(95,255,194,0.25),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(circle_at_80%_0%,rgba(247,215,120,0.25),transparent_55%)]" />

      <div className="container mx-auto flex max-w-6xl flex-col gap-10 px-6 text-white lg:flex-row lg:items-center">
        <div className="space-y-5 lg:w-3/5">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#5fffc2]">
            Prop firm intelligence
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
            Research proprietary trading firms without the noise.
          </h1>
          <p className="text-base text-white/80 md:text-lg">
            MadProps keeps payouts, account sizes, drawdowns, discounts, and rule-set quirks across 21 firms and 150+
            accounts in one live filterable dashboard. Switch between cards and comparison table, save favorites, and
            export details for your playbook.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-[#f6c850]/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#f6c850]">
              Live data feed
            </span>
            <span className="rounded-full border border-[#5fffc2]/50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#5fffc2]">
              Updated daily
            </span>
          </div>
        </div>

        <div className="grid flex-1 gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_60px_-30px_rgba(4,12,23,0.8)]">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
