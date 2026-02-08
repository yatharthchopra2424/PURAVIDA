// ─── Product Types ───────────────────────────────────────────

export type QualityBadge = "ISO" | "GMP" | "FSSAI" | "Halal" | "FDA" | "Export";

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  subcategory?: string;
  botanicalName?: string;
  activeIngredient?: string;
  activeCompound?: string;
  concentration?: string;
  applications: string[];
  description: string;
  image: string;
  qualityBadges: QualityBadge[];
  isHalal: boolean;
  popularity: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  label: string;
  subcategories: string[];
  exampleProducts: string[];
  productCount: number;
}

// ─── Navigation Types ────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  children?: NavChild[];
}

export interface NavChild {
  label: string;
  href: string;
  description?: string;
  image?: string;
}

// ─── Company Types ───────────────────────────────────────────

export interface CompanyStat {
  label: string;
  value: string;
  suffix?: string;
}

export interface BusinessProfileItem {
  label: string;
  value: string;
}

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

// ─── Hero Types ──────────────────────────────────────────────

export interface HeroSlide {
  headline: string;
  subheading: string;
  description: string;
}

// ─── Contact Form ────────────────────────────────────────────

export interface ContactFormData {
  name: string;
  email: string;
  product: string;
  quantity: string;
  description: string;
}

// ─── Cart / Quote Types ──────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
}
