"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Category, Product } from "@/types";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductFilters } from "@/components/products/ProductFilters";
import { Input } from "@/components/ui/Input";

export function CategoryClient({
  category,
  products,
  highlightSlug,
}: {
  category: Category;
  products: Product[];
  highlightSlug?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popularity");

  const allApplications = useMemo(() => {
    const apps = new Set<string>();
    products.forEach((p) => p.applications.forEach((a) => apps.add(a)));
    return Array.from(apps).sort();
  }, [products]);

  const allIngredients = useMemo(() => {
    const ingredients = new Set<string>();
    products.forEach((p) => {
      if (p.activeIngredient) ingredients.add(p.activeIngredient);
    });
    return Array.from(ingredients).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.botanicalName?.toLowerCase().includes(q) ||
          p.activeIngredient?.toLowerCase().includes(q)
      );
    }

    if (selectedApplications.length > 0) {
      result = result.filter((p) =>
        p.applications.some((a) => selectedApplications.includes(a))
      );
    }

    if (selectedIngredients.length > 0) {
      result = result.filter((p) =>
        selectedIngredients.includes(p.activeIngredient || "")
      );
    }

    switch (sortBy) {
      case "name-asc":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result = [...result].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "popularity":
      default:
        result = [...result].sort((a, b) => b.popularity - a.popularity);
    }

    return result;
  }, [products, searchQuery, selectedApplications, selectedIngredients, sortBy]);

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/" className="transition-colors hover:text-black">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/products"
            className="transition-colors hover:text-black"
          >
            Products
          </Link>
          <span>/</span>
          <span className="font-medium text-black">{category.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black lg:text-4xl">
              {category.name}
            </h1>
            <p className="mt-2 text-black opacity-75">
              {filteredProducts.length} product
              {filteredProducts.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder={`Search ${category.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-black placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Layout: Filters + Grid */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
          <ProductFilters
            applications={allApplications}
            activeIngredients={allIngredients}
            selectedApplications={selectedApplications}
            selectedIngredients={selectedIngredients}
            onApplicationChange={setSelectedApplications}
            onIngredientChange={setSelectedIngredients}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
          <ProductGrid products={filteredProducts} highlightSlug={highlightSlug} />
        </div>
      </div>
    </div>
  );
}
