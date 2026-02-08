import Link from "next/link";
import { CategoryClient } from "./CategoryClient";
import { fetchCategories, fetchProductsByCategory } from "@/lib/catalog";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams?: { highlight?: string };
}) {
  const categorySlug = params.category;
  const highlightSlug = searchParams?.highlight;

  const [categories, products] = await Promise.all([
    fetchCategories(),
    fetchProductsByCategory(categorySlug),
  ]);

  const category = categories.find((item) => item.slug === categorySlug);

  if (!category) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Category not found</h1>
        <p className="mt-2 text-gray-600">
          The category you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm font-medium text-orange-500 hover:text-orange-600"
        >
          View all products &rarr;
        </Link>
      </div>
    );
  }

  return (
    <CategoryClient
      category={category}
      products={products}
      highlightSlug={highlightSlug}
    />
  );
}
