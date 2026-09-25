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
    // Registration identifiers let search and AI engines tie this site to
    // the same business in government registers (all verified against the
    // certificates in private-docs/legal/).
    legalName: COMPANY.legalName,
    taxID: COMPANY.gst,
    identifier: [
      { "@type": "PropertyValue", propertyID: "GSTIN", value: COMPANY.gst },
      { "@type": "PropertyValue", propertyID: "FSSAI licence", value: COMPANY.fssaiLicense },
      { "@type": "PropertyValue", propertyID: "Udyam registration", value: COMPANY.udyam },
    ],
    brand: [{ "@type": "Brand", name: "Selvasoul" }],
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/images/logo-new.png"),
    },
    image: absoluteUrl("/opengraph-image"),
    description:
      "Supplier and exporter of standardised herbal extracts, essential oils, oleoresins and nutraceutical ingredients from New Delhi, India. FSSAI licensed; Halal India certified product range.",
    slogan: COMPANY.tagline,
    // The LLP's registration date (Udyam certificate), not team experience.
    foundingDate: COMPANY.llpRegistered,
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
    // Only credentials a document exists for (private-docs/legal/). ISO and
    // GMP were listed here without one; add them back with the certificate.
    hasCredential: [
      { name: "FSSAI State Licence", id: COMPANY.fssaiLicense },
      { name: "Halal India certification", id: "HIW28020819" },
    ].map((c) => ({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "certification",
      name: c.name,
      identifier: c.id,
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
