import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  fetchCatalogSnapshot,
  fetchCategoryBySlug,
  fetchProductBySlug,
  fetchProductsByCategory,
} from "@/lib/catalog";
import { JsonLd } from "@/components/shared/JsonLd";
import {
  breadcrumbSchema,
  jsonLdGraph,
  productSchema,
} from "@/lib/structured-data";
import { ProductDetailClient } from "./ProductDetailClient";
import { ProductInsights } from "@/components/products/ProductInsights";
import { buildFaq, buildTitle, fitMetaDescription } from "@/lib/product-content";

export const revalidate = 3600;

// Only paths returned by generateStaticParams are valid. Anything else
// is a genuine 404 with a 404 status code, rather than a 200 carrying a
// "not found" page — Google treats the latter as a thin duplicate and
// keeps it indexed. Verified: unknown slugs return 404, known ones 200.
//
// Trade-off: the param list is fixed at build time, so a product added
// through the admin panel needs a rebuild before its page exists. The
// admin routes fire a deploy hook to do that automatically — see
// src/lib/deploy-hook.ts.
export const dynamicParams = false;

// Pre-renders the full catalog. Previously these pages resolved against
// a hardcoded 28-product array, so 228 of the 256 URLs in the sitemap
// rendered "Product not found" with an HTTP 200.
export async function generateStaticParams() {
  try {
    const { products } = await fetchCatalogSnapshot();
    return products.map((product) => ({
      category: product.categorySlug,
      slug: product.slug,
    }));
  } catch (error) {
    console.error("[products/[category]/[slug]] generateStaticParams failed", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    return { title: "Product not found", robots: { index: false, follow: true } };
  }

  // Prefer a specification-led description: it is what buyers actually
  // search for, and it keeps each of the ~250 pages distinct.
  const specs = [
    product.botanicalName,
    product.activeIngredient && `Active: ${product.activeIngredient}`,
    product.concentration,
  ]
    .filter(Boolean)
    .join(" · ");

  const description = fitMetaDescription(
    specs ? `${specs}. ${product.description}` : product.description
  );

  return {
    title: { absolute: buildTitle(product) },
    description,
    keywords: [
      product.name,
      product.botanicalName,
      product.activeIngredient,
      product.category,
      "bulk supplier",
      "manufacturer",
    ].filter((value): value is string => Boolean(value)),
    alternates: {
      canonical: `/products/${product.categorySlug}/${product.slug}`,
    },
    openGraph: {
      type: "website",
      title: `${product.name} | PuraVida Natural`,
      description,
      url: `/products/${product.categorySlug}/${product.slug}`,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;

  const product = await fetchProductBySlug(slug);
  if (!product) {
    notFound();
  }

  // Slugs are globally unique, so a product reached under the wrong
  // category is a canonicalisation problem, not a 404. Redirect once
  // to the correct URL instead of serving duplicate content.
  if (product.categorySlug !== categorySlug) {
    redirect(`/products/${product.categorySlug}/${product.slug}`);
  }

  const category = await fetchCategoryBySlug(product.categorySlug);
  if (!category) {
    notFound();
  }

  const relatedProducts = (await fetchProductsByCategory(product.categorySlug))
    .filter((entry) => entry.slug !== product.slug)
    .slice(0, 4);

  const jsonLd = jsonLdGraph(
    productSchema(product),
    {
      "@type": "FAQPage",
      mainEntity: buildFaq(product).map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products" },
      { name: category.name, path: `/products/${category.slug}` },
      {
        name: product.name,
        path: `/products/${product.categorySlug}/${product.slug}`,
      },
    ])
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductDetailClient
        product={product}
        category={category}
        relatedProducts={relatedProducts}
      >
        <ProductInsights product={product} />
      </ProductDetailClient>
    </>
  );
}
