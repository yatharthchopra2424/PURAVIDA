import type { Metadata } from "next";
import { fitMetaDescription } from "@/lib/product-content";
import { notFound } from "next/navigation";
import {
  fetchCategories,
  fetchCategoryBySlug,
  fetchProductsByCategory,
} from "@/lib/catalog";
import { JsonLd } from "@/components/shared/JsonLd";
import {
  breadcrumbSchema,
  categoryCollectionSchema,
  jsonLdGraph,
} from "@/lib/structured-data";
import { CategoryClient } from "./CategoryClient";

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

// Pre-render every category at build time; anything new is generated
// on first request and then cached.
export async function generateStaticParams() {
  try {
    const categories = await fetchCategories();
    return categories.map((category) => ({ category: category.slug }));
  } catch (error) {
    console.error("[products/[category]] generateStaticParams failed", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = await fetchCategoryBySlug(categorySlug);

  if (!category) {
    return { title: "Category not found", robots: { index: false, follow: true } };
  }

  const description = fitMetaDescription(
    category.description ||
      `Browse our range of ${category.name.toLowerCase()}: standardised botanical ingredients for bulk supply.`,
    `Specifications, standardisation and test method on every product page. Bulk supply for India and export.`
  );

  return {
    title: category.name,
    description: description.slice(0, 155),
    alternates: { canonical: `/products/${category.slug}` },
    openGraph: {
      type: "website",
      title: `${category.name} | PuraVida Natural`,
      description: description.slice(0, 155),
      url: `/products/${category.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;

  const category = await fetchCategoryBySlug(categorySlug);

  // A real 404, not a 200 with "Category not found" in the body.
  if (!category) {
    notFound();
  }

  const products = await fetchProductsByCategory(category.slug);

  // `highlight` is read client-side via useSearchParams inside
  // CategoryClient. Awaiting searchParams here would opt the whole
  // route into dynamic rendering in Next 16 — it is a UI concern
  // (which card to flash), not something the server needs.
  const jsonLd = jsonLdGraph(
    categoryCollectionSchema(category, products),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products" },
      { name: category.name, path: `/products/${category.slug}` },
    ])
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      <CategoryClient category={category} products={products} />
    </>
  );
}
