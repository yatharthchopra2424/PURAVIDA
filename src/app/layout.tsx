import type { Metadata } from "next";
import { Space_Grotesk, Inter, Plus_Jakarta_Sans, Open_Sans } from "next/font/google";
import localFont from "next/font/local";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import "./globals.css";

import { TopBar } from "@/components/layout/TopBar";
import { Footer } from "@/components/layout/Footer";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";

// Modern heading font - Space Grotesk
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
});

// Body text font - Inter
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

// Fallback body text font - Plus Jakarta Sans
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  preload: true,
});

// Navbar font - Open Sans
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
  preload: true,
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: true,
});

const Header = dynamic(
  () => import("@/components/layout/Header").then((m) => m.Header),
  { ssr: false }
);
const MobileNav = dynamic(
  () => import("@/components/layout/MobileNav").then((m) => m.MobileNav),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import("@/components/search/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false }
);

export const metadata: Metadata = {
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
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PuraVida Natural",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? "";
  const isAdminRoute = pathname.startsWith("/x-admin");

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${plusJakartaSans.variable} ${openSans.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-surface text-gray-900`}
      >
        {isAdminRoute ? (
          // Admin routes — no public chrome
          <>{children}</>
        ) : (
          <SmoothScrollProvider>
            <div className="fixed top-0 left-0 right-0 z-50">
              <TopBar />
              <Header />
            </div>
            <main className="min-h-screen">{children}</main>
            <Footer />
            {/* Client-side overlays */}
            <MobileNav />
            <CommandPalette />
          </SmoothScrollProvider>
        )}
      </body>
    </html>
  );
}
