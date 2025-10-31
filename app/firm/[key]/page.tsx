// app/firm/[key]/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildAffiliateUrl } from "@/lib/affiliates";
import { FIRMS, getFirmByKey, getAllFirmKeys } from "@/lib/firms";
import { recommendRelatedFirms } from "@/lib/recommend";
import { FirmMiniCard } from "@/components/FirmMiniCard";
import BackToResults from "./BackToResults";

// Make a local prop type that matches Next 15's PageProps shape
type FirmPageProps = {
  params: Promise<{ key: string }>;
};

export async function generateStaticParams() {
  return getAllFirmKeys().map((key) => ({ key }));
}

export async function generateMetadata(props: FirmPageProps): Promise<Metadata> {
  const { key } = await props.params;
  const firm = getFirmByKey(key);
  if (!firm) return {};

  const title = `${firm.name} Review • MadProps`;
  const description =
    firm.notes ||
    `${firm.name} details: models ${firm.model.join(
      ", "
    )}, platforms ${firm.platforms.join(", ")}.`;
  const url = `https://madprops.io/firm/${firm.key}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: firm.logo ? [{ url: firm.logo }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: firm.logo ? [firm.logo] : undefined,
    },
  };
}

export default async function FirmDetailPage(props: FirmPageProps) {
  const { key } = await props.params;
  const firm = getFirmByKey(key);
  if (!firm) return notFound();

  const related = recommendRelatedFirms(firm, FIRMS, { limit: 4 });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Firms", href: "/firms" },
    { label: firm.name },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: firm.name,
    image: firm.logo,
    description: firm.notes,
    brand: { "@type": "Brand", name: firm.name },
    aggregateRating:
      typeof firm.trustpilot === "number"
        ? {
            "@type": "AggregateRating",
            ratingValue: firm.trustpilot,
            reviewCount: 1,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      url: firm.homepage,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="container max-w-6xl py-8">
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-2">
        <BackToResults />
      </div>

      {/* 2-column layout */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* === MAIN COLUMN === */}
        <article className="lg:col-span-2">
          <header className="flex items-start gap-4">
            {firm.logo && (
              // keep simple <img> to avoid importing extra components
              <img
                src={firm.logo ?? "/logos/placeholder.png"}
                alt={firm.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded bg-white/5 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold leading-tight">{firm.name}</h1>
              {firm.notes && (
                <p className="text-muted-foreground mt-1">{firm.notes}</p>
              )}
              <div className="mt-2 text-sm">
                {firm.model?.length ? (
                  <span className="mr-2 rounded-full border px-2 py-0.5">
                    {firm.model.join(" • ")}
                  </span>
                ) : null}
                {firm.platforms?.length ? (
                  <span className="text-muted-foreground">
                    Platforms: {firm.platforms.join(", ")}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          {/* Primary CTA */}
          <div className="mt-4">
            <a
              href={buildAffiliateUrl(firm.signup, firm.key)}
              target="_blank"
              rel="nofollow sponsored noopener"
            >
              <Button className="border-2 border-transparent hover:border-[#5fffc2] hover:shadow-[0_0_12px_#5fffc2aa] transition-all duration-300">
                Get Started
              </Button>
            </a>
          </div>

          {/* Quick facts */}
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase text-muted-foreground">
                Max funding
              </div>
              <div className="text-lg font-semibold">
                ${firm.maxFunding.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase text-muted-foreground">
                Payout
              </div>
              <div className="text-lg font-semibold">
                {Math.round((firm.payout ?? 0) * 100)}%
              </div>
            </div>

            {typeof firm.trustpilot === "number" && (
              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase text-muted-foreground">
                  Trustpilot
                </div>
                <div className="text-lg font-semibold">
                  {firm.trustpilot.toFixed(1)}
                </div>
              </div>
            )}

            {typeof firm.minDays === "number" && (
              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase text-muted-foreground">
                  Min days (eval)
                </div>
                <div className="text-lg font-semibold">{firm.minDays}</div>
              </div>
            )}
          </section>

          {/* Primary CTA Button */}
          <div className="mt-6">
            <a
              href={buildAffiliateUrl(firm.signup, firm.key)}
              target="_blank"
              rel="nofollow sponsored noopener"
            >
              <Button className="w-full border-2 border-transparent hover:border-[#5fffc2] hover:shadow-[0_0_12px_#5fffc2aa] transition-all duration-300">
                Get Started
              </Button>
            </a>
          </div>

          {/* Links */}
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border p-5">
              <h2 className="font-semibold">Links</h2>
              <ul className="mt-3 list-disc pl-5 text-sm">
                <li>
                  <a
                    href={firm.homepage}
                    target="_blank"
                    rel="nofollow noopener"
                    className="underline"
                  >
                    Official site
                  </a>
                </li>
                <li>
                  <a
                    href={buildAffiliateUrl(firm.signup, firm.key)}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="underline text-primary font-semibold"
                  >
                    Signup / dashboard
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </article>

        {/* === SIDEBAR === */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border p-4">
            <h3 className="text-base font-semibold mb-3">You might also like</h3>
            <div className="space-y-3">
              {related.length ? (
                related.map((r) => <FirmMiniCard key={r.key} firm={r} />)
              ) : (
                <p className="text-sm text-muted-foreground">
                  No related firms found.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* JSON-LD */}
      <Script
        id="firm-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
