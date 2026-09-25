import { NavItem, CompanyStat, BusinessProfileItem, FeatureCard } from "@/types";
import { COMPANY } from "@/lib/constants";

export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Our Business", href: "/our-business" },
  { label: "Advantage", href: "/advantage" },
  // Was "/about#facility" — an anchor to a section that no longer
  // exists. Now a real page.
  { label: "Facility", href: "/facility" },
  { label: "Industry", href: "/industry" },
  {
    label: "Our Product Range",
    href: "/products",
    children: [
      {
        label: "Herbal Extracts",
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
        label: "Nutraceuticals",
        href: "/products/nutraceuticals",
        description: "Health and wellness ingredients",
        image: "/images/Product%20Card%20Backgrounds.png",
      },
    ],
  },
];

export const companyStats: CompanyStat[] = [
  { label: "Years Experience", value: "14", suffix: "+" },
  { label: "Products", value: "250", suffix: "+" },
  { label: "Licence", value: "FSSAI", suffix: "" },
  { label: "Certification", value: "Halal", suffix: " India" },
];

// Sourced from COMPANY so the homepage and footer can never disagree.
// They previously did: the footer showed the real GST while this table
// showed a placeholder, on the same page.
//
// NOTE: the "Import-Export Code" row was removed because its value was
// the placeholder "0500XXXXXX". On a B2B export site, buyers verify
// these — a visibly fake code is worse than none. Add it back here once
// the real IEC is to hand.
export const businessProfile: BusinessProfileItem[] = [
  { label: "Nature of Business", value: "Manufacturer & Supplier" },
  { label: "Industry Experience", value: `${COMPANY.experienceYears}+ years` },
  { label: "Markets", value: "India & export" },
  { label: "Legal Status", value: "Limited Liability Partnership (LLP)" },
  { label: "GST Number", value: COMPANY.gst },
  { label: "FSSAI Licence", value: COMPANY.fssaiLicense },
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
      "Supplying buyers across India and exporting overseas, with the documentation international shipments need.",
  },
  {
    icon: "shield-check",
    title: "Certified Excellence",
    description:
      "FSSAI licensed and Halal India certified, with a certificate of analysis for every batch on request.",
  },
  {
    icon: "headset",
    title: "Expert Support",
    description:
      "Dedicated formulation scientists and technical consultants to support your product development journey.",
  },
];
