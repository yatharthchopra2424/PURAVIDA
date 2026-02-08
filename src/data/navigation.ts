import { NavItem, HeroSlide, CompanyStat, BusinessProfileItem, FeatureCard } from "@/types";

export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Our Business", href: "/about#business" },
  { label: "Advantage", href: "/about#advantage" },
  { label: "Facility", href: "/about#facility" },
  {
    label: "Our Product Range",
    href: "/products",
    children: [
      {
        label: "Standardized Herbal Extracts",
        href: "/products/herbal-extracts",
        description: "Premium extracts with standardized active compounds",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
      {
        label: "Essential Oils",
        href: "/products/essential-oils",
        description: "Therapeutic grade, steam distilled oils",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
      {
        label: "Oleoresins",
        href: "/products/oleoresins",
        description: "Concentrated high-potency spice extracts",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
      {
        label: "Fruit Juice Powders",
        href: "/products/fruit-juice-powders",
        description: "Natural spray-dried fruit concentrates",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
      {
        label: "Phytochemicals",
        href: "/products/phytochemicals",
        description: "Research-grade bioactive isolates",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
      {
        label: "Amino Acids",
        href: "/products/amino-acids",
        description: "Pharmaceutical-grade essential nutrients",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
      {
        label: "Nutraceuticals",
        href: "/products/nutraceuticals",
        description: "Health and wellness ingredients",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
    ],
  },
];

export const heroSlides: HeroSlide[] = [
  {
    headline: "Ayurvedic Heritage.\nModern Science.",
    subheading: "Ancient Wisdom, Contemporary Innovation",
    description:
      "Bridging 5,000 years of Ayurvedic tradition with cutting-edge extraction technology to deliver the purest botanical ingredients on the planet.",
  },
  {
    headline: "Advanced Manufacturing\nCapabilities",
    subheading: "State-of-the-Art Production",
    description:
      "ISO 9001:2015 certified facilities equipped with supercritical CO₂ extraction, spray drying, and molecular distillation technologies.",
  },
  {
    headline: "Uncompromising\nQuality Control",
    subheading: "Laboratory-Verified Excellence",
    description:
      "Every batch HPLC tested and verified. From raw material screening to final product release, quality is our non-negotiable promise.",
  },
  {
    headline: "Precision Herbal\nExtraction",
    subheading: "Preserving Natural Potency",
    description:
      "Our proprietary extraction processes preserve the full spectrum of bioactive compounds while achieving industry-leading standardization levels.",
  },
];

export const companyStats: CompanyStat[] = [
  { label: "Years Experience", value: "25", suffix: "+" },
  { label: "Products", value: "500", suffix: "+" },
  { label: "Countries Served", value: "50", suffix: "+" },
  { label: "Certification", value: "ISO", suffix: " 9001:2015" },
];

export const businessProfile: BusinessProfileItem[] = [
  { label: "Nature of Business", value: "Manufacturer & Supplier" },
  { label: "Employee Range", value: "100 - 500" },
  { label: "Year of Establishment", value: "2000" },
  { label: "Legal Status", value: "Private Limited Company" },
  { label: "Annual Turnover", value: "₹50 - 100 Crore" },
  { label: "Import-Export Code", value: "0500XXXXXX" },
  { label: "GST Number", value: "07XXXXX1234X1ZX" },
  { label: "ISO Certification", value: "ISO 9001:2015" },
];

export const whyChooseFeatures: FeatureCard[] = [
  {
    icon: "award",
    title: "Premium Quality",
    description:
      "Every product meets international pharmacopoeia standards with full traceability from source to shelf.",
  },
  {
    icon: "leaf",
    title: "100% Natural",
    description:
      "Sustainably sourced botanicals from India's richest biodiversity regions, free from synthetic additives.",
  },
  {
    icon: "flask",
    title: "Scientific Innovation",
    description:
      "Cutting-edge extraction and standardization techniques rooted in ancient Ayurvedic wisdom.",
  },
  {
    icon: "globe",
    title: "Global Reach",
    description:
      "Trusted by partners across 50+ countries with seamless international logistics and regulatory compliance.",
  },
  {
    icon: "shield-check",
    title: "Certified Excellence",
    description:
      "ISO 9001:2015, GMP, FSSAI, and FDA registered. Every certification you need for market confidence.",
  },
  {
    icon: "headset",
    title: "Expert Support",
    description:
      "Dedicated formulation scientists and technical consultants to support your product development journey.",
  },
];
