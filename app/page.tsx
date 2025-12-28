import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export function generateMetadata({ searchParams }: PageProps): Metadata {
  const viewParam = searchParams?.view;
  const isCardsView = Array.isArray(viewParam) ? viewParam.includes("cards") : viewParam === "cards";

  return {
    alternates: {
      canonical: isCardsView ? "/score-cards" : "/",
    },
  };
}

export default function Page() {
  return <HomePageClient />;
}
