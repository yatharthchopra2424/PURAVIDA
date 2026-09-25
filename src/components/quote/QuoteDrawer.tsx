"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Trash2, ArrowRight, PackageSearch, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { QuoteLineFields } from "@/components/quote/QuoteLineFields";
import { track } from "@/lib/track";


/**
 * Slide-over quote cart. Opens whenever a product is added (see
 * useCartStore.addItem), so "Get Quote" always visibly does something.
 */
export function QuoteDrawer() {
  const { items, isOpen, close, removeItem, updateLine } = useCartStore();
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on route change (e.g. after "Request quote").
  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!isOpen) return;
    track("quote_open", { items: items.length });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-labelledby="quote-drawer-title">
          <motion.button
            aria-label="Close quote cart"
            className="absolute inset-0 h-full w-full cursor-default bg-emerald-950/40 backdrop-blur-[2px]"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl outline-none"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="quote-drawer-title" className="font-heading text-lg font-bold text-gray-900">
                    Your quote request
                  </h2>
                  <p className="text-xs text-gray-500">
                    {items.length} product{items.length === 1 ? "" : "s"} · pricing within 1 business day
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" data-lenis-prevent>
              {items.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <PackageSearch className="mb-3 h-10 w-10 text-gray-300" aria-hidden="true" />
                  <p className="font-semibold text-gray-900">No products yet</p>
                  <p className="mt-1 text-sm text-gray-500">Add products to request one combined quote.</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {items.map((line) => (
                  <motion.div
                    key={line.product.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40, transition: { duration: 0.18 } }}
                    className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3"
                  >
                    <div className="flex gap-3">
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                        {line.product.image && (
                          <Image src={line.product.image} alt="" fill sizes="56px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${line.product.categorySlug}/${line.product.slug}`}
                          className="line-clamp-1 font-semibold text-gray-900 hover:text-emerald-700"
                        >
                          {line.product.name}
                        </Link>
                        <p className="line-clamp-1 text-xs text-gray-500">
                          {line.product.botanicalName || line.product.category}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(line.product.id)}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remove ${line.product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <QuoteLineFields line={line} compact />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <footer className="space-y-2.5 border-t border-gray-100 bg-white px-5 py-4">
              <Link
                href="/contact#quote"
                onClick={() => close()}
                aria-disabled={items.length === 0}
                className={`btn-shine group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 active:scale-[0.98] ${
                  items.length === 0 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Request quote
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link
                href="/products"
                onClick={() => close()}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition-colors hover:border-emerald hover:text-emerald-700"
              >
                Add more products
              </Link>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
