import { TopBar } from "@/components/layout/TopBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { CommandPalette } from "@/components/search/CommandPalette";
import { QuoteDrawer } from "@/components/quote/QuoteDrawer";
import { PageviewTracker } from "@/components/quote/PageviewTracker";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { JsonLd } from "@/components/shared/JsonLd";
import {
  jsonLdGraph,
  organizationSchema,
  websiteSchema,
} from "@/lib/structured-data";

/**
 * Public site chrome.
 *
 * Header, MobileNav and CommandPalette were previously loaded via
 * next/dynamic with `ssr: false`, which meant the entire navigation —
 * and with it the mega-menu's internal linking — never appeared in the
 * server-rendered HTML. Crawlers saw a page with no nav.
 *
 * They are Client Components, so their JS still ships to the browser
 * and hydrates as before; `ssr: false` additionally suppressed the
 * HTML, which was the part we did not want.
 *
 * This also unblocks the Next.js 16 upgrade: `ssr: false` inside a
 * Server Component is a hard error in Next 15+.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScrollProvider>
      {/* Sitewide Organization + WebSite schema. Other pages reference
          these by @id rather than repeating them. */}
      <JsonLd data={jsonLdGraph(organizationSchema(), websiteSchema())} />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald"
      >
        Skip to main content
      </a>

      <div className="fixed top-0 left-0 right-0 z-50">
        <TopBar />
        <Header />
      </div>

      <main id="main-content" className="min-h-screen">
        {children}
      </main>

      <Footer />

      {/* Client-side overlays */}
      <MobileNav />
      <CommandPalette />
      <QuoteDrawer />
      <PageviewTracker />
    </SmoothScrollProvider>
  );
}
