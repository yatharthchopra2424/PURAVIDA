import { HeroCarousel } from "@/components/Hero/HeroCarousel";
import { WelcomeSection } from "@/components/home/WelcomeSection";
import { WhyChoose } from "@/components/home/WhyChoose";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { ProductCarousel } from "@/components/home/ProductRange";
import { CompanyInfo } from "@/components/home/CompanyInfo";
import { AboutSection } from "@/components/home/AboutSection";
import { ProofBar, CredentialsTicker, ExportSection, TransparencySection, QuoteBand } from "@/components/home/TrustSections";
import { fetchCatalogSnapshot } from "@/lib/catalog";

// ISR: serve from the CDN and regenerate hourly instead of querying
// Supabase on every visit.
export const revalidate = 3600;

export default async function HomePage() {
  const { categories, products } = await fetchCatalogSnapshot();

  return (
    <>
      <HeroCarousel />
      <ProofBar productCount={products.length} />
      <CredentialsTicker />
      {/* Brand story sits directly under the hero — everything below it
          shifts down. Kept outside the parallax wrapper so its own
          gradient reads cleanly. */}
      <WelcomeSection />
      <div className="parallax-bg-desktop relative responsive-container" style={{ backgroundImage: "url('/images/Product%20Card%20Backgrounds.png')" }}>
        <WhyChoose />
        <ShopByCategory categories={categories} />
        <ProductCarousel categories={categories} products={products} />
        <CompanyInfo />
        <AboutSection />
      </div>
      <ExportSection />
      <TransparencySection />
      <QuoteBand productCount={products.length} />
    </>
  );
}
