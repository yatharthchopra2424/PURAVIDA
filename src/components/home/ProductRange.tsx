"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { useCartStore } from "@/stores/useCartStore";
import { cn } from "@/lib/utils";
import { Category, Product } from "@/types";

export function ProductCarousel({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const [activeCategory, setActiveCategory] = useState(
    categories[0]?.slug || ""
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  if (categories.length === 0) {
    return null;
  }

  const filteredProducts = products.filter(
    (p) => p.categorySlug === activeCategory
  );

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          subtitle="Our Product Range"
          title="The Full Spectrum of Nature's Lab"
          description="Browse our comprehensive range of premium natural ingredients, each backed by rigorous quality testing and standardization."
        />

        {/* Category Toggle */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setActiveCategory(cat.slug);
                scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
              }}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                activeCategory === cat.slug
                  ? "bg-emerald text-white shadow-lg shadow-emerald/25"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Carousel */}
        <div
          ref={scrollRef}
          className="mt-10 flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {filteredProducts.map((product) => (
            <ProductQuickCard
              key={product.id}
              product={product}
              onAddToQuote={() => addItem(product)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductQuickCard({
  product,
  onAddToQuote,
}: {
  product: Product;
  onAddToQuote: () => void;
}) {
  return (
    <motion.div
      layoutId={`product-${product.slug}`}
      className="flex w-[280px] flex-shrink-0 snap-start flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-emerald/20"
    >
      {/* Image */}
      <div className="relative h-48 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${product.image}')` }}
        />
        <div className="absolute inset-0 bg-emerald/10" />
        <div className="text-center p-4">
          <span className="text-3xl">🌿</span>
          <p className="mt-2 text-xs font-medium text-emerald-600">
            {product.category}
          </p>
        </div>
        {product.qualityBadges.length > 0 && (
          <div className="absolute top-3 right-3 flex gap-1">
            {product.qualityBadges.slice(0, 2).map((badge) => (
              <span
                key={badge}
                className="rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-emerald shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h4 className="mb-1 text-sm font-bold text-gray-900">{product.name}</h4>
        {product.activeIngredient && (
          <p className="mb-2 text-xs text-gray-500">
            Active: <span className="font-medium text-emerald">{product.activeIngredient}</span>
            {product.concentration && (
              <span className="ml-1 text-gray-400">({product.concentration})</span>
            )}
          </p>
        )}
        <div className="mb-3 flex flex-wrap gap-1">
          {product.applications.slice(0, 2).map((app) => (
            <span
              key={app}
              className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500"
            >
              {app}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onAddToQuote}
            className="flex-1 text-xs"
          >
            Get Quote
          </Button>
          <Link
            href={`/products/${product.categorySlug}/${product.slug}`}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-emerald"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
