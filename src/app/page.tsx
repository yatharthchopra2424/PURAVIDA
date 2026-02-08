import { FluidHero } from "@/components/Hero/FluidHero";
import { WhyChoose } from "@/components/home/WhyChoose";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { ProductCarousel } from "@/components/home/ProductRange";
import { CompanyInfo } from "@/components/home/CompanyInfo";
import { AboutSection } from "@/components/home/AboutSection";
import { fetchCatalogSnapshot } from "@/lib/catalog";

export default async function HomePage() {
  const { categories, products } = await fetchCatalogSnapshot();

  return (
    <>
      <FluidHero />
      <div className="parallax-bg-desktop relative responsive-container" style={{ backgroundImage: "url('/images/Product%20Card%20Backgrounds.png')" }}>
        <WhyChoose />
        <ShopByCategory categories={categories} />
        <ProductCarousel categories={categories} products={products} />
        <CompanyInfo />
        <AboutSection />
      </div>
    </>
  );
}
