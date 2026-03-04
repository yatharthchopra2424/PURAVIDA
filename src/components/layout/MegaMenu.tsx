"use client";

import React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function MegaMenu({ isOpen, onClose, onMouseEnter, onMouseLeave }: MegaMenuProps) {
  const { categories, loading, error } = useCategories();

  const hasCategories = categories.length > 0;
  const splitIndex = Math.ceil(categories.length / 2);
  const firstColumn = categories.slice(0, splitIndex);
  const secondColumn = categories.slice(splitIndex);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-0 right-0 top-full z-50 border-t border-gray-200 bg-white shadow-xl"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div className="mx-auto max-w-[1280px] px-5 py-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Here is our range
                </h3>
              </div>
              <Link
                href="/products"
                onClick={onClose}
                className="text-[15px] font-semibold text-orange-500 transition-colors hover:text-orange-600"
              >
                View all products →
              </Link>
            </div>

            {hasCategories ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3.5">
                <div className="grid grid-cols-1 gap-x-7 gap-y-0 md:grid-cols-2">
                  {[firstColumn, secondColumn].map((column, columnIndex) => (
                    <div key={columnIndex} className="space-y-0">
                      {column.map((category) => (
                        <Link
                          key={category.slug}
                          href={`/products/${category.slug}`}
                          onClick={onClose}
                          className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-gray-200 py-2 transition-colors hover:bg-white/70"
                        >
                          <div className="min-w-0 pr-1">
                            <p
                              title={category.name}
                              className="truncate text-[15px] font-medium leading-6 text-gray-800 group-hover:text-emerald"
                            >
                              {category.name}
                            </p>
                          </div>
                          <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[11px] font-semibold text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald">
                            {category.productCount}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                {loading
                  ? "Loading categories..."
                  : error
                    ? `Unable to load categories: ${error}`
                    : "No categories available yet."}
              </div>
            )}

            <div className="mt-3 border-t border-gray-200 pt-2.5">
              <div className="text-right">
              <Link
                href="/contact"
                onClick={onClose}
                className="text-[15px] font-medium text-gray-600 transition-colors hover:text-emerald"
              >
                Need help choosing? Contact our team
              </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
