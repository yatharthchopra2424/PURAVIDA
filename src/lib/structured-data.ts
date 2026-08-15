import { COMPANY } from "@/lib/constants";
import { absoluteUrl } from "@/lib/site";
import type { Category, Product } from "@/types";

/**
 * JSON-LD builders.
 *
 * Structured data is how Google understands that this is a manufacturer
 * with a product catalog rather than a generic brochure site. Product
 * schema drives rich results on ingredient searches; Organization feeds
 * the knowledge panel; BreadcrumbList replaces the ugly URL trail in
 * search results with a readable hierarchy.
 *
 * All values come from our own database or constants — never user
 * input — so serialising them into a script tag is safe.
 */

const ORGANIZATION_ID = absoluteUrl("/#organization");
const WEBSITE_ID = absoluteUrl("/#website");

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: COMPANY.name,
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/images/logo-new.png"),
    },
    image: absoluteUrl("/opengraph-image"),
    description:
      "Manufacturer and global exporter of premium herbal extracts, essential oils, oleoresins and nutraceutical ingredients. ISO 9001:2015, GMP and FSSAI certified.",
    slogan: COMPANY.tagline,
    foundingDate: COMPANY.established,
    email: COMPANY.email,
    telephone: COMPANY.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "169, Uttam Nagar West",
      addressLocality: "New Delhi",
      postalCode: "110059",
      addressCountry: "IN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: COMPANY.phone,
      email: COMPANY.salesEmail,
      contactType: "sales",
      areaServed: "Worldwide",
      availableLanguage: ["en"],
    },
    identifier: [
      {
        "@type": "PropertyValue",
        name: "GST",
        value: COMPANY.gst,
      },
    ],
    hasCredential: [
      "ISO 9001:2015",
      "GMP",
      "FSSAI",
    ].map((c) => ({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "certification",
      name: c,
    })),
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl("/"),
    name: COMPANY.name,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en",
  };
}

/** Breadcrumb trail. Pass items in order, root first. */
export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productSchema(product: Product) {
  return {
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.category,
    url: absoluteUrl(`/products/${product.categorySlug}/${product.slug}`),
    ...(product.botanicalName && { alternateName: product.botanicalName }),
    ...(product.image?.startsWith("http") && { image: product.image }),
    brand: { "@type": "Brand", name: COMPANY.name },
    manufacturer: { "@id": ORGANIZATION_ID },
    additionalProperty: [
      product.activeIngredient && {
        "@type": "PropertyValue",
        name: "Active Ingredient",
        value: product.activeIngredient,
      },
      product.activeCompound && {
        "@type": "PropertyValue",
        name: "Active Compound",
        value: product.activeCompound,
      },
      product.concentration && {
        "@type": "PropertyValue",
        name: "Concentration",
        value: product.concentration,
      },
      product.isHalal && {
        "@type": "PropertyValue",
        name: "Halal Certified",
        value: "Yes",
      },
    ].filter(Boolean),
    // B2B: pricing is quote-based, so advertise availability and the
    // enquiry route rather than a price we cannot state.
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "PriceSpecification",
        valueAddedTaxIncluded: false,
      },
      seller: { "@id": ORGANIZATION_ID },
      url: absoluteUrl("/contact"),
      businessFunction: "http://purl.org/goodrelations/v1#Sell",
    },
  };
}

/** Category listing — helps Google understand the catalog structure. */
export function categoryCollectionSchema(
  category: Category,
  products: Product[]
) {
  return {
    "@type": "CollectionPage",
    name: category.name,
    description: category.description,
    url: absoluteUrl(`/products/${category.slug}`),
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 50).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.name,
        url: absoluteUrl(`/products/${product.categorySlug}/${product.slug}`),
      })),
    },
  };
}

/** Wraps one or more schema objects into a single @graph document. */
export function jsonLdGraph(...nodes: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
