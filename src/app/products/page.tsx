import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { fetchCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Products | PuraVida Natural",
  description:
    "Explore our comprehensive range of premium botanical ingredients — herbal extracts, essential oils, oleoresins, phytochemicals, amino acids and nutraceuticals.",
};

export default async function ProductsPage() {
  const categories = await fetchCategories();

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/" className="transition-colors hover:text-black">
            Home
          </Link>
          <span>/</span>
          <span className="font-medium text-black">Products</span>
        </nav>

        {/* Header */}
        <div className="mb-12 max-w-2xl">
          <h1 className="text-4xl font-bold text-black lg:text-5xl">
            Our Product Range
          </h1>
          <p className="mt-4 text-lg text-black opacity-70">
            Discover 500+ premium botanical ingredients across 7 product
            families. Each product is rigorously tested and standardized for
            consistent quality.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/products/${category.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-emerald/20 hover:shadow-xl"
            >
              {/* Image area */}
              <div className="relative flex h-52 items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
                <div className="text-center transition-transform duration-300 group-hover:scale-110">
                  <span className="text-5xl">🌿</span>
                </div>
                <Badge
                  variant="category"
                  className="absolute left-4 top-4 bg-white/90 shadow-sm"
                >
                  {category.label}
                </Badge>
                <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-emerald shadow-sm">
                  {category.productCount} products
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-6">
                <h2 className="mb-2 text-lg font-bold text-black transition-colors group-hover:text-emerald">
                  {category.name}
                </h2>
                <p className="mb-3 text-sm text-black opacity-70 line-clamp-2">
                  {category.description}
                </p>

                {/* Example products */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {category.exampleProducts.map((product) => (
                    <span
                      key={product}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-black opacity-70"
                    >
                      {product}
                    </span>
                  ))}
                </div>

                {/* Subcategories */}
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex gap-1">
                    {category.subcategories.slice(0, 2).map((sub) => (
                      <span key={sub} className="text-[10px] text-black opacity-60">
                        {sub}
                      </span>
                    ))}
                    {category.subcategories.length > 2 && (
                      <span className="text-[10px] text-black opacity-60">
                        +{category.subcategories.length - 2} more
                      </span>
                    )}
                  </div>
                  <span className="flex items-center text-sm font-semibold text-orange-500 group-hover:text-orange-600">
                    Browse
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
