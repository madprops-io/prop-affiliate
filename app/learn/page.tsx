import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn - Prop firm guides and comparisons | MadProps",
  description:
    "Browse MadProps guides for prop firm discounts, instant funding comparisons, and challenge tips. Updated regularly as we add more firms and offers.",
};

type Guide = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

const GUIDES: Guide[] = [
  {
    title: "Best Prop Firms 2025 (futures-focused)",
    description: "Compare payouts, drawdown rules, platform support, and current discounts across top futures prop firms.",
    href: "/learn/best-prop-firms-2025",
    badge: "Flagship",
  },
];

export default function LearnPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f6c850]">Learn</p>
        <h1 className="text-3xl font-bold text-white">Guides for prop firm traders</h1>
        <p className="text-sm text-white/70">
          Deep-dives on futures prop firms, instant funding programs, and discount hunts. We keep these updated as rules
          and promos change.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-1 hover:border-[#f6c850]/60 hover:bg-white/10"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
              <span>Guide</span>
              {guide.badge ? (
                <span className="rounded-full border border-[#f6c850]/60 px-2 py-0.5 text-[10px] text-[#f6c850]">
                  {guide.badge}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white group-hover:text-[#f6c850]">{guide.title}</h2>
            <p className="mt-2 text-sm text-white/70">{guide.description}</p>
            <p className="mt-3 text-sm font-semibold text-[#f6c850]">Read guide →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
