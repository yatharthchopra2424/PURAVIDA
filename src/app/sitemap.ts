import type { MetadataRoute } from "next";
import { fetchCatalogSnapshot } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";
import type { Category, Product } from "@/types";

// Regenerate hourly rather than pinning the catalog at build time.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/products"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  // The Supabase project pauses when idle (hence the keepalive cron).
  // If it is unreachable during a build, an unhandled throw here fails
  // the entire deploy. Degrade to the static pages instead.
  let categories: Category[] = [];
  let products: Product[] = [];

  try {
    ({ categories, products } = await fetchCatalogSnapshot());
  } catch (error) {
    console.error(
      "[sitemap] Catalog fetch failed — emitting static pages only.",
      error
    );
    return staticPages;
  }

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/products/${category.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Only emit product URLs whose category actually resolves, so the
  // sitemap can never again advertise a page that 404s.
  const categorySlugs = new Set(categories.map((category) => category.slug));

  const productPages: MetadataRoute.Sitemap = products
    .filter((product) => categorySlugs.has(product.categorySlug))
    .map((product) => ({
      url: absoluteUrl(`/products/${product.categorySlug}/${product.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...categoryPages, ...productPages];
}
