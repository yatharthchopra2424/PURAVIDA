"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MegaMenu({ isOpen, onClose }: MegaMenuProps) {
  const { categories, loading } = useCategories();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0].slug);
    }
  }, [activeCategory, categories]);

  const hasCategories = categories.length > 0;

  const handleCategoryHover = useCallback((slug: string) => {
    setActiveCategory(slug);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-0 right-0 top-full z-50 border-t border-gray-100 bg-white shadow-2xl"
            onMouseLeave={onClose}
          >
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 p-0">
              {/* Full Width: Category Grid */}
              <div className="p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Product Categories
                </p>
                {hasCategories ? (
                  <div className="grid grid-cols-4 gap-3 lg:grid-cols-7">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/products/${category.slug}`}
                        onMouseEnter={() => handleCategoryHover(category.slug)}
                        onClick={onClose}
                        className={cn(
                          "group flex flex-col rounded-lg p-3 transition-all duration-200 border",
                          activeCategory === category.slug
                            ? "bg-emerald-50 border-emerald/20 ring-1 ring-emerald/30"
                            : "border-gray-100 hover:bg-gray-50 hover:border-emerald/10"
                        )}
                      >
                        <div className="mb-2 flex h-10 w-full items-center justify-center rounded-md bg-gradient-to-br from-emerald-50 to-emerald-100">
                          <span className="text-lg">🌿</span>
                        </div>
                        <span
                          className={cn(
                            "text-center text-xs font-semibold transition-colors line-clamp-2",
                            activeCategory === category.slug
                              ? "text-emerald"
                              : "text-gray-700 group-hover:text-emerald"
                          )}
                        >
                          {category.name}
                        </span>
                        <span className="mt-1 text-center text-[10px] text-gray-400">
                          {category.productCount} products
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500 text-center">
                    {loading ? "Loading categories..." : "No categories available yet."}
                  </div>
                )}

                {/* View All */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <Link
                    href="/products"
                    onClick={onClose}
                    className="text-sm font-semibold text-orange-500 transition-colors hover:text-orange-600"
                  >
                    View All Categories →
                  </Link>
                  <Link
                    href="/contact"
                    onClick={onClose}
                    className="text-sm font-medium text-gray-500 transition-colors hover:text-emerald"
                  >
                    Request Custom Quote
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
