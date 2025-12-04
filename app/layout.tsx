// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import LayoutClient from "../components/LayoutClient";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Fonts
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.madprops.com"),
  title: {
    default: "MadProps - Best Prop Firm Deals, Instant Funding, Reviews and Discounts #MadProps",
    template: "%s | MadProps",
  },
  description:
    "Find the best prop firm deals, instant funding options, discount codes, reviews, and challenge comparisons. Updated daily to help traders save money. #MadProps",
  openGraph: {
    type: "website",
    url: "https://www.madprops.com",
    siteName: "MadProps",
    title: "MadProps - Best Prop Firm Deals, Instant Funding, Reviews and Discounts #MadProps",
    description:
      "Compare the best prop firms, instant funding options, discount codes, and reviews. Updated daily. #MadProps",
    images: [{ url: "/og/madprops-og.png", width: 1200, height: 630, alt: "MadProps" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@madprops_io",
    creator: "@madprops_io",
    title: "MadProps - Best Prop Firm Deals, Instant Funding, Reviews and Discounts #MadProps",
    description:
      "Compare the best prop firms, instant funding options, discount codes, and reviews. Updated daily. #MadProps",
    images: ["/og/madprops-og.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://www.madprops.com" },
  themeColor: "#0b1220",
  manifest: "/manifest.json",
icons: {
  icon: [
    { url: "/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
    { url: "/favicon-48.png?v=2", sizes: "48x48", type: "image/png" },
    { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
    { url: "/icon-256.png?v=2", sizes: "256x256", type: "image/png" },
    { url: "/icon-384.png?v=2", sizes: "384x384", type: "image/png" },
    { url: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    { url: "/favicon.ico?v=2" }
  ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MadProps",
  "url": "https://www.madprops.com",
  "logo": "https://www.madprops.com/icon-512.png",
  "image": "https://www.madprops.com/icon-512.png",
  "sameAs": [
    "https://x.com/MadProps", 
  ]
};

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.className}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        {/* Suspense boundary required for pages that use useSearchParams/usePathname/etc */}
        <Suspense fallback={<main className="p-6">Loading...</main>}>
          <LayoutClient>{children}</LayoutClient>
        </Suspense>

        {/* Telemetry */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
