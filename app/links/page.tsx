"use client";

import Image from "next/image";
import Link from "next/link";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { FIRMS } from "@/lib/firms";

type FirmLink = {
  key: string;
  name: string;
  logo?: string | null;
  href: string;
};

const dedupeFirms = (): FirmLink[] => {
  const seen = new Set<string>();
  return FIRMS.filter((firm) => {
    const key = firm.key || firm.name;
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(firm.signup || firm.homepage);
  }).map((firm) => {
    const href = buildAffiliateUrl(firm.signup || firm.homepage || "/", firm.key, "links-page");
    return {
      key: firm.key || firm.name,
      name: firm.name,
      logo: firm.logo || (firm.key ? `/logos/${firm.key}.png` : null),
      href,
    };
  });
};

function FirmLogo({ name, src }: { name: string; src?: string | null }) {
  const fallback = src || null;
  const initials =
    name
      ?.split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  if (!fallback) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white/80">
        {initials}
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
      <Image
        src={fallback}
        alt={`${name} logo`}
        width={48}
        height={48}
        className="h-10 w-10 object-contain"
        unoptimized
      />
    </div>
  );
}

export default function LinksPage() {
  const firms = dedupeFirms();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 text-white">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold">Affiliate links</h1>
        <p className="text-sm text-white/70">
          Quick access to each firm we track. Links include our affiliate code; please confirm details on the firm site.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {firms.map((firm) => (
          <Link
            key={firm.key}
            href={firm.href}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:border-[#26ffd4]/50 hover:bg-white/10"
          >
            <FirmLogo name={firm.name} src={firm.logo} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold group-hover:text-[#5fffd9]">{firm.name}</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/60">Affiliate link</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
