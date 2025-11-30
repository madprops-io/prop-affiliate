import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeList } from "./BadgeList";
import { RatingStars } from "./RatingStars";
import type { FirmRow } from "@/lib/useFirms";
import { formatFundingOrAccounts } from "@/lib/funding";

type CardFirm = FirmRow & {
  rating?: number | null;
  url?: string | null;
  model?: FirmRow["model"] | string | string[] | null;
  payout?: number | null;
};

export function FirmCard({ firm }: { firm: CardFirm }) {
  const websiteUrl = firm.homepage ?? firm.url ?? undefined;
  const rawSignup = firm.signup ?? firm.url ?? undefined;
  const signupUrl = rawSignup ? buildAffiliateUrl(rawSignup, firm.key) : undefined;

  const starValue =
    typeof firm.rating === "number"
      ? firm.rating
      : typeof firm.trustpilot === "number"
      ? firm.trustpilot
      : undefined;

  const modelList = Array.isArray(firm.model)
    ? firm.model.filter(Boolean)
    : firm.model
    ? [String(firm.model)]
    : [];
  const tags = [...modelList, ...(firm.platforms ?? [])].filter(Boolean);

  const payoutPct =
    typeof firm.payoutSplit === "number"
      ? Math.round(firm.payoutSplit)
      : typeof firm.payout === "number"
      ? Math.round(firm.payout * 100)
      : null;

  const fallbackLogo = `/logos/${firm.key}.png`;
  const rawLogo = (firm.logo || "").trim();
  const logoSrc = rawLogo.length > 0 ? rawLogo : fallbackLogo;
  const hasLogo = /^https?:\/\//i.test(logoSrc) || logoSrc.startsWith("/");
  const [logoErrored, setLogoErrored] = useState(false);
  const showLogo = hasLogo && !logoErrored;
  const initials =
    firm.name
      ?.split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const LogoPanel = ({ children }: { children: ReactNode }) => (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#ffe5a3]/85 via-[#ffcb70]/75 to-[#ff9f48]/70 p-[2px] shadow-[0_10px_20px_-12px_rgba(255,198,88,0.8)]">
      <div className="flex h-full w-full items-center justify-center rounded-[16px] bg-slate-950/90">
        {children}
      </div>
    </div>
  );

  const fundingDisplay = formatFundingOrAccounts(firm.maxFunding, firm.maxAccounts);
  const stats = [
    ...(fundingDisplay
      ? [
          {
            label: fundingDisplay.label,
            value: fundingDisplay.value,
          },
        ]
      : []),
    {
      label: "Payout",
      value: payoutPct != null ? `${payoutPct}%` : "-",
    },
    {
      label: "Min days (Eval)",
      value: firm.minDays === 0 ? "Instant" : typeof firm.minDays === "number" ? `${firm.minDays}` : "-",
    },
    {
      label: "Platforms",
      value: (firm.platforms ?? []).join(", ") || "-",
    },
  ];

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5/60 backdrop-blur transition-colors hover:bg-white/10">
      <CardContent className="space-y-4 p-5">
        <div className="flex gap-4">
          <LogoPanel>
            {showLogo ? (
              <Image
                src={logoSrc}
                alt={`${firm.name} logo`}
                width={64}
                height={64}
                className="h-full w-full object-contain p-1.5"
                unoptimized
                onError={() => setLogoErrored(true)}
              />
            ) : (
              <span className="text-xs font-semibold tracking-[0.2em] text-white/80">{initials}</span>
            )}
          </LogoPanel>

          <div className="min-w-0 flex-1">
            <Link href={`/firm/${firm.key}`} className="text-lg font-semibold hover:underline">
              {firm.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
              <span>{modelList[0] ?? "Model TBA"}</span>
              {typeof starValue === "number" && (
                <span className="inline-flex items-center gap-1">
                  <RatingStars value={starValue} />
                  <span>({starValue.toFixed(1)})</span>
                </span>
              )}
            </div>
            {tags.length > 0 && (
              <div className="mt-2">
                <BadgeList items={tags.slice(0, 4)} />
              </div>
            )}
          </div>
        </div>

        <ul className="grid gap-3 rounded-xl border border-white/10 bg-black/10 p-4 text-sm">
          {stats.map((stat) => (
            <li key={stat.label} className="flex justify-between text-white/70">
              <span>{stat.label}</span>
              <span className="font-medium text-white">{stat.value}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          {websiteUrl && (
            <Link
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-white/15 hover:ring-white/25"
            >
              Website
            </Link>
          )}

          <Link
            href={signupUrl ?? websiteUrl ?? `/firm/${firm.key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-300/90 to-emerald-200/80 px-4 py-2 text-sm font-semibold text-[#0b1320] shadow-sm hover:from-emerald-300 hover:to-emerald-200"
          >
            Get Started
          </Link>

          <Link
            href={`/firm/${firm.key}`}
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-medium text-white/80 ring-1 ring-white/15 hover:text-white hover:ring-white/25"
          >
            Details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
