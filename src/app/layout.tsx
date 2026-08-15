import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
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
    "Leading manufacturer and exporter of premium herbal extracts, essential oils, oleoresins, and nutraceutical ingredients. ISO 9001, GMP, FSSAI certified.",
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
      "Discover 200+ premium botanical ingredients. ISO certified manufacturer & global exporter.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PuraVida Natural — Premium Botanical Extracts & Ingredients",
    description:
      "Discover 200+ premium botanical ingredients. ISO certified manufacturer & global exporter.",
  },
  icons: {
    icon: "/images/logo-new.png",
    apple: "/images/logo-new.png",
  },
  robots: {
    index: true,
    follow: true,
  },
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
      </body>
    </html>
  );
}
