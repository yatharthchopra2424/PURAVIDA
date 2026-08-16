"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
import { Search, X, ArrowRight } from "lucide-react";
import { useSearchStore } from "@/stores/useSearchStore";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { Badge } from "@/components/ui/Badge";
import { Product } from "@/types";

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, query, results, isLoading, open, close, setQuery } =
    useSearchStore();

  // Cmd+K / Ctrl+K shortcut
  useKeyboardShortcut("k", open);

  const handleSelect = useCallback(
    (product: Product) => {
      close();
      router.push(`/products/${product.categorySlug}/${product.slug}`);
    },
    [close, router]
  );

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, close]);

  /**
   * Scroll lock.
   *
   * The page kept scrolling behind the open dialog. Lenis drives
   * scrolling here, so `overflow: hidden` on <body> alone does nothing —
   * Lenis has to be told to stop. Both are applied: Lenis for the smooth
   * scroller, and the body style for any native scroll (and for the
   * scrollbar-width compensation that stops the layout shifting).
   */
  const lenis = useLenis();

  useEffect(() => {
    if (!isOpen) return;

    lenis?.stop();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      lenis?.start();
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen, lenis]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop.
              Lighter scrim and no heavy blur: blurring the whole page
              behind a search dialog costs a full-viewport filter repaint
              on every frame and made the underlying content unreadable
              rather than merely de-emphasised. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-emerald-950/45"
            onClick={close}
            aria-hidden="true"
          />

          {/* Centred dialog.
              Was `left-1/2 top-[15vh] -translate-x-1/2`, which drifted
              off-centre once the body gained scrollbar-compensation
              padding. A flex-centred fixed wrapper is immune to that and
              is the pattern used by every command palette people know
              (Linear, GitHub, Algolia). */}
          <div
            className="fixed inset-0 z-[101] flex items-start justify-center overflow-y-auto p-4 pt-[12vh] sm:pt-[14vh]"
            onClick={close}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search products"
              initial={{ opacity: 0, scale: 0.97, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -12 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
            <Command
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
              shouldFilter={false}
            >
              {/* Input */}
              <div className="flex items-center border-b border-gray-100 px-5">
                <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search by product name, ingredient, or application..."
                  className="flex h-14 w-full border-0 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
                  autoFocus
                />
                {isLoading && (
                  <div className="flex-shrink-0 mr-2">
                    <div className="animate-spin h-4 w-4 text-emerald">⟳</div>
                  </div>
                )}
                <button
                  onClick={close}
                  aria-label="Close search"
                  className="flex-shrink-0 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </div>

              {/* Results.
                  data-lenis-prevent so the wheel reaches this list
                  instead of being swallowed by the smooth scroller. */}
              <Command.List
                data-lenis-prevent
                className="filter-scroll max-h-[60vh] overflow-y-auto overscroll-contain p-3"
              >
                {isLoading && query.length >= 1 && (
                  <Command.Empty className="px-5 py-12 text-center">
                    <div className="inline-block animate-spin mb-4">
                      <div className="text-3xl">⟳</div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mt-4">
                      Searching for &quot;{query}&quot;...
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Finding all matching products
                    </p>
                  </Command.Empty>
                )}

                {!isLoading && query.length < 1 && (
                  <Command.Empty className="px-5 py-8 text-center">
                    <div className="text-3xl mb-3">🔍</div>
                    <p className="text-sm text-gray-500 mb-6">
                      Start typing to search products by name, active ingredient, or application
                    </p>
                    
                    {/* Quick suggestions */}
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                        Quick Suggestions
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {["Ashwagandha", "Curcumin", "Essential Oil", "Piperine"].map(
                          (suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setQuery(suggestion)}
                              className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald font-medium transition-all hover:bg-emerald-100 hover:scale-105"
                            >
                              {suggestion}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Popular Products */}
                    {results.length === 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                          Popular Products
                        </p>
                        <Command.Group>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {[
                              { name: "Curcumin 95%", ingredient: "Turmeric Extract", cat: "Herbal Extracts" },
                              { name: "Ashwagandha Root", ingredient: "Ashwagandha Extract", cat: "Herbal Extracts" },
                              { name: "Piperine 95%", ingredient: "Black Pepper Extract", cat: "Herbal Extracts" },
                              { name: "Clove Leaf Oil", ingredient: "Essential Oil", cat: "Essential Oils" }
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => setQuery(item.name)}
                                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 text-left transition-all hover:bg-emerald-50 hover:border-emerald/20"
                              >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex-shrink-0">
                                  <span className="text-lg">🌿</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {item.cat}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </Command.Group>
                      </div>
                    )}
                  </Command.Empty>
                )}

                {!isLoading && query.length >= 1 && results.length === 0 && (
                  <Command.Empty className="px-5 py-12 text-center">
                    <div className="text-3xl mb-3">😔</div>
                    <p className="text-sm text-gray-700 font-medium">
                      No results found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Try searching by: product name • botanical name • active ingredient
                    </p>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                        What you can search:
                      </p>
                      <div className="text-xs text-gray-600 space-y-1 mb-4">
                        <p>• Curcumin 95% (product name)</p>
                        <p>• Curcuma longa (botanical name)</p>
                        <p>• Piperine (active ingredient)</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                        Try these instead:
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {["Ashwagandha", "Curcumin", "Essential Oil", "Turmeric"].map(
                          (suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setQuery(suggestion)}
                              className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-600 font-medium transition-all hover:bg-orange-100 hover:scale-105"
                            >
                              {suggestion}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </Command.Empty>
                )}

                {results.length > 0 && (
                  <Command.Group>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {results.map((product) => (
                        <Command.Item
                          key={product.id}
                          value={product.slug}
                          onSelect={() => handleSelect(product)}
                          className="group flex cursor-pointer gap-3 rounded-xl border border-transparent p-3 transition-all duration-150 hover:bg-emerald-50 hover:border-emerald/10 data-[selected=true]:bg-emerald-50 data-[selected=true]:border-emerald/10"
                        >
                          {/* Thumbnail */}
                          <motion.div
                            layoutId={`search-${product.slug}`}
                            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100"
                          >
                            <span className="text-xl">🌿</span>
                          </motion.div>

                          {/* Info */}
                          <div className="flex flex-1 flex-col justify-center min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-black truncate">
                                {product.name}
                              </span>
                              {product.qualityBadges.includes("ISO") && (
                                <Badge variant="iso" className="text-[9px] px-1.5 py-0">
                                  ISO
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 truncate">
                              {product.activeIngredient || product.category}
                              {product.concentration &&
                                ` · ${product.concentration}`}
                            </span>
                          </div>

                          {/* Arrow */}
                          <ArrowRight className="h-4 w-4 flex-shrink-0 self-center text-gray-300 transition-colors group-hover:text-emerald" />
                        </Command.Item>
                      ))}
                    </div>
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-2.5">
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium">Esc</kbd>
                    Close
                  </span>
                </div>
                {results.length > 0 && (
                  <span className="text-[11px] text-gray-400">
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
