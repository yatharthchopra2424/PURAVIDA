import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteAnalytics } from "@/components/providers/SiteAnalytics";
import "./globals.css";

import { SITE_URL } from "@/lib/site";

/**
 * Two font families, down from six.
 *
 * Space Grotesk (headings) and Inter (body) are the only ones actually
 * referenced by tailwind.config.ts and globals.css. Plus Jakarta Sans,
 * Open Sans, Geist Sans and Geist Mono were all loaded with
 * preload: true on every page but never used — 19 font files competing
 * for connections during initial render.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  // Resolves all relative canonical / Open Graph URLs against the real
  // production origin. Without this, Next emits relative OG URLs that
  // crawlers and social scrapers cannot resolve.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PuraVida Natural — Premium Botanical Extracts & Ingredients",
    template: "%s | PuraVida Natural",
  },
  description:
    "Supplier and exporter of standardised herbal extracts, essential oils, oleoresins and nutraceutical ingredients from New Delhi, India. 14+ years of experience, FSSAI licensed.",
  keywords: [
    "herbal extracts",
    "essential oils",
    "oleoresins",
    "botanical ingredients",
    "nutraceuticals",
    "PuraVida Natural",
    "bulk botanical supplier",
  ],
  authors: [{ name: "PuraVida Natural" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PuraVida Natural",
    url: "/",
    title: "PuraVida Natural — Premium Botanical Extracts & Ingredients",
    description:
      "250+ botanical ingredients: herbal extracts, essential oils, oleoresins and nutraceuticals. Supplying India and export markets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PuraVida Natural — Premium Botanical Extracts & Ingredients",
    description:
      "250+ botanical ingredients: herbal extracts, essential oils, oleoresins and nutraceuticals. Supplying India and export markets.",
  },
  // icon.png / apple-icon.png / favicon.ico in this directory are picked
  // up automatically by Next's file-based metadata convention — no
  // `icons` field needed here. See also manifest.ts for the PWA icons.
  robots: {
    index: true,
    follow: true,
  },
  // Search Console / Bing Webmaster ownership verification. Leave the env
  // vars unset until you've added the property — ADD-SEARCH-CONSOLE.md
  // has the exact steps and where the token comes from.
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
      : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#6AA40E",
  colorScheme: "light",
};

/**
 * Root layout is now a pure shell.
 *
 * It previously called headers() to detect admin routes, which opted
 * EVERY page in the app out of static rendering — the build reported
 * `ƒ (Dynamic)` for all 24 routes. Chrome selection is now handled by
 * the (public) and (admin) route groups instead, which is a routing
 * concern and costs nothing at runtime.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-surface text-gray-900">
        {children}
        <SpeedInsights />
        <SiteAnalytics />
      </body>
    </html>
  );
}
