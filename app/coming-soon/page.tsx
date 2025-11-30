import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MadProps — Coming Soon",
  description:
    "The refreshed MadProps experience is almost ready. We're polishing the prop firm directory and scoring tools before opening the doors.",
};

const checklist = [
  "Live prop firm directory with transparent filters",
  "Score cards that compare payouts, rules, and perks",
  "Affiliate deals verified and updated daily",
];

export default function ComingSoon() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#020611] via-[#060d1d] to-[#02040b] px-6 py-16 text-white">
      <div className="w-full max-w-2xl space-y-10 text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">MadProps</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            We’re rebuilding the futures prop firm directory.
          </h1>
          <p className="text-base text-white/70">
            The home and table views are getting a full refresh. While we finish polishing the data and layout, the public
            site is paused. We’ll be back in just a few days—sharper, faster, and easier to compare.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5/30 p-6 text-left text-sm text-white/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">What’s shipping</p>
          <ul className="mt-3 space-y-3">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-300">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 text-sm text-white/70">
          <p>Need affiliate help or want an early preview?</p>
          <p className="text-base font-semibold text-white">
            <Link href="mailto:hello@madprops.com" className="underline hover:text-emerald-300">
              hello@madprops.com
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
