"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { navigation } from "@/data/navigation";
import { useUIStore } from "@/stores/useUIStore";
import { useCategories } from "@/hooks/useCategories";

export function MobileNav() {
  const { isMobileNavOpen, closeMobileNav } = useUIStore();
  const { categories, loading, error } = useCategories();

  return (
    <AnimatePresence>
      {isMobileNavOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={closeMobileNav}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-full w-[320px] bg-white shadow-2xl lg:hidden"
          >
            <div className="flex h-full flex-col">
              {/* Close button */}
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <span className="text-lg font-bold text-emerald">
                  PuraVida
                </span>
                <button
                  onClick={closeMobileNav}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation links */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.label}>
                      {item.children ? (
                        <div>
                          <span className="flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-800">
                            {item.label}
                          </span>
                          <ul className="ml-3 mt-1 space-y-0.5 border-l border-gray-100 pl-3">
                            {categories.map((cat) => (
                              <li key={cat.slug}>
                                <Link
                                  href={`/products/${cat.slug}`}
                                  onClick={closeMobileNav}
                                  className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald"
                                >
                                  {cat.name}
                                </Link>
                              </li>
                            ))}
                            {categories.length === 0 && (
                              <li className="px-3 py-2 text-sm text-gray-400">
                                {loading
                                  ? "Loading categories..."
                                  : error
                                    ? `Unable to load categories: ${error}`
                                    : "No categories available"}
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={closeMobileNav}
                          className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Bottom CTA */}
              <div className="border-t border-gray-100 p-4">
                <Link
                  href="/contact"
                  onClick={closeMobileNav}
                  className="flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  Send Inquiry
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
