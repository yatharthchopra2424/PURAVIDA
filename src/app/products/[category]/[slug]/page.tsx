import Link from "next/link";
import { fetchCategories, fetchProductBySlug, fetchProductsByCategory } from "@/lib/catalog";
import { ProductDetailClient } from "./ProductDetailClient";

export default async function ProductDetailPage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const product = await fetchProductBySlug(params.slug);
  const categories = await fetchCategories();
  const category = categories.find((cat) => cat.slug === params.category);

  if (!product || !category) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm font-medium text-orange-500"
        >
          View all products &rarr;
        </Link>
      </div>
    );
  }

  const relatedProducts = (await fetchProductsByCategory(product.categorySlug))
    .filter((item) => item.slug !== product.slug)
    .slice(0, 4);

  return (
    <ProductDetailClient
      product={product}
      category={category}
      relatedProducts={relatedProducts}
    />
  );
}
