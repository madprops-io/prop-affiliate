"use client";

const PROOF_PILLS = [
  { label: "Live data", className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" },
  { label: "20+ firms tracked", className: "border-[#f6c850]/50 bg-[#f6c850]/10 text-[#f6c850]" },
  { label: "150+ programs", className: "border-[#f6c850]/50 bg-[#f6c850]/10 text-[#f6c850]" },
  { label: "Updated daily", className: "border-[#f6c850]/50 bg-[#f6c850]/10 text-[#f6c850]" },
];

export default function HeroBanner() {
  return (
    <section className="relative isolate w-full overflow-hidden bg-gradient-to-br from-[#050b16] via-[#050f1e] to-[#041322] py-6 md:py-8 lg:py-10">
      <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(95,255,194,0.25),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(circle_at_80%_0%,rgba(247,215,120,0.25),transparent_55%)]" />

      <div className="container mx-auto flex max-w-7xl flex-col gap-4 px-6 text-white">
        <div className="space-y-3 text-left max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#5fffc2]">
            Prop firm intelligence
          </p>
          <h1 className="text-2xl font-semibold leading-snug text-white sm:text-3xl md:text-4xl">
            Research proprietary trading firms without the noise.
          </h1>
          <p className="text-sm text-white/80 md:text-base leading-relaxed">
            MadProps keeps payouts, account sizes, drawdowns, discounts, and rule-set quirks across 20+ firms and 150+
            accounts in one live filterable dashboard. Switch between cards and comparison table, save favorites, and
            export details for your playbook.
          </p>
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            {PROOF_PILLS.map((pill) => (
              <span
                key={pill.label}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] whitespace-nowrap ${pill.className}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
