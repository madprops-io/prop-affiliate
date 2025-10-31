import Image from "next/image";
import Link from "next/link";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeList } from "./BadgeList";
import { RatingStars } from "./RatingStars";

// Be flexible with incoming shape (old lib/FIRMS and new API)
type AnyFirm = {
  key: string;
  name: string;
  // can be string or string[]
  model?: string | string[] | null;
  platforms?: string[] | null;
  // old shape had payout as 0..1; new API has payoutSplit (0..100)
  payout?: number | null;
  payoutSplit?: number | null;
  homepage?: string | null;
  signup?: string | null;
  url?: string | null;        // new API field
  logo?: string | null;
  rating?: number | null;
  trustpilot?: number | null;
  minDays?: number | null;
};

export function FirmCard({ firm }: { firm: AnyFirm }) {
  // ---- normalize fields -------------------------------------------------
  // url fallbacks
  const websiteUrl = firm.homepage ?? firm.url ?? undefined;
  const rawSignup = firm.signup ?? firm.url ?? undefined;
  const signupUrl = rawSignup ? buildAffiliateUrl(rawSignup, firm.key) : undefined;

  // rating (prefer firm.rating, else trustpilot)
  const starValue =
    typeof firm.rating === "number"
      ? firm.rating
      : typeof firm.trustpilot === "number"
      ? firm.trustpilot
      : undefined;

  // model as array for chips
  const models = Array.isArray(firm.model)
    ? firm.model.filter(Boolean)
    : firm.model
    ? [String(firm.model)]
    : [];

  // combine chips (limit to 4)
  const tagList = [...models, ...(firm.platforms ?? [])].filter(Boolean).slice(0, 4);

  // payout percent (support both shapes)
  const payoutPct =
    typeof firm.payoutSplit === "number"
      ? Math.round(firm.payoutSplit)
      : typeof firm.payout === "number"
      ? Math.round(firm.payout * 100)
      : null;

  // safe logo: allow absolute http(s) OR a Next.js public/ path starting with "/"
  const logo = (firm.logo || "").trim();
  const hasLogo =
    logo.length > 0 &&
    (/^https?:\/\//i.test(logo) || logo.startsWith("/"));

  // ----------------------------------------------------------------------

  return (
    <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm transition-colors hover:bg-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* logo (safe) */}
          <div className="flex items-center">
            {hasLogo ? (
              <Image
                src={logo}
                alt={`${firm.name} logo`}
                width={48}
                height={48}
                className="rounded"
                unoptimized
              />
            ) : (
              <div className="h-12 w-12 rounded bg-white/10 flex items-center justify-center text-[10px] text-white/50">
                No logo
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/firm/${firm.key}`}
                className="font-semibold hover:underline truncate"
              >
                {firm.name}
              </Link>

              {typeof firm.minDays === "number" && (
                <span className="ml-auto shrink-0 rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                  Min days: {firm.minDays}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{models[0] ?? "—"}</span>
              {typeof starValue === "number" && (
                <span className="inline-flex items-center gap-1">
                  <RatingStars value={starValue} />
                  <span>({starValue.toFixed(1)})</span>
                </span>
              )}
              {payoutPct != null && (
                <span className="ml-auto rounded border px-1.5 py-0.5 text-[11px]">
                  Payout: {payoutPct}%
                </span>
              )}
            </div>

            {tagList.length > 0 && (
              <div className="mt-2">
                <BadgeList items={tagList} />
              </div>
            )}

            {/* actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {websiteUrl && (
                <Link
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-white/15 hover:ring-white/25"
                >
                  Website
                </Link>
              )}

              {signupUrl && (
                <Link
                  href={signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-emerald-300/90 to-emerald-200/80 px-4 py-2 text-sm font-semibold text-[#0b1320] shadow-sm hover:from-emerald-300 hover:to-emerald-200"
                >
                  Get Started
                </Link>
              )}

              <Link
                href={`/firm/${firm.key}`}
                className="ml-auto inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-medium text-white/80 ring-1 ring-white/15 hover:text-white hover:ring-white/25"
              >
                Details
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
