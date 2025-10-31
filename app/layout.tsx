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
  metadataBase: new URL("https://madprops.io"),
  title: {
    default: "MadProps — Futures Prop Firm Comparison",
    template: "%s | MadProps",
  },
  description:
    "Compare top futures prop firms — payouts, rules, fees, platforms, and real perks — all in one place.",
  openGraph: {
    type: "website",
    url: "https://madprops.io",
    siteName: "MadProps",
    title: "MadProps — Futures Prop Firm Comparison",
    description:
      "Transparent, fast, accurate firm comparisons. Launching soon — follow @madprops_io for deals.",
    images: [{ url: "/og/madprops-og.png", width: 1200, height: 630, alt: "MadProps" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@madprops_io",
    creator: "@madprops_io",
    title: "MadProps — Futures Prop Firm Comparison",
    description:
      "Transparent, fast firm comparisons: payouts, rules, fees, platforms, perks.",
    images: ["/og/madprops-og.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://madprops.io" },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.className}`}>
        {/* Suspense boundary required for pages that use useSearchParams/usePathname/etc */}
        <Suspense fallback={<main className="p-6">Loading…</main>}>
          <LayoutClient>{children}</LayoutClient>
        </Suspense>

        {/* Telemetry */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
