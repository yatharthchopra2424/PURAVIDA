"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Send } from "lucide-react";
import type { Product } from "@/types";
import { useCartStore } from "@/stores/useCartStore";

/**
 * Phone-only bar that keeps "Request quote" one thumb-tap away once the
 * page's own CTA has scrolled out of view. Watches the element with the
 * given id, so it never shows while the real button is on screen.
 */
export function StickyQuoteBar({ product, watchId }: { product: Product; watchId: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(watchId);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      // Show once the CTA is above the viewport (scrolled past), not while it is below it.
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [watchId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden"
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{product.name}</p>
            <button
              type="button"
              onClick={() => addItem(product)}
              className="btn-shine inline-flex h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 active:scale-[0.97]"
            >
              Request quote <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
