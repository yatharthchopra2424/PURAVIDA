"use client";

import React from "react";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  highlightSlug?: string;
}

export function ProductGrid({ products, highlightSlug }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Try adjusting your filters or search terms
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          highlight={product.slug === highlightSlug}
        />
      ))}
    </div>
  );
}
