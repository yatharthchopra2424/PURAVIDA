"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { ProductThumb, hasRealImage } from "@/components/products/ProductThumb";
import { useCartStore } from "@/stores/useCartStore";
import { cn } from "@/lib/utils";
import { Category, Product } from "@/types";

/** How many products each tab features. The full list is one click away. */
const FEATURED = 12;

/**
 * Home-page product carousel.
 *
 * - Products WITH a photo are listed first, so a first-time visitor sees
 *   pictures, not placeholders (the old version listed A to Z, and the
 *   first four nutraceuticals had no photo).
 * - Native scroll-snap, so touch swipe, trackpad and keyboard just work,
 *   plus previous/next buttons and a progress bar.
 * - Nutraceuticals opens first: the most-visited category in the
 *   Aug to Sep 2026 analytics.
 */
export function ProductCarousel({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [activeCategory, setActiveCategory] = useState(
    categories.find((c) => c.slug === "nutraceuticals")?.slug ?? categories[0]?.slug ?? ""
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const inCategory = useMemo(() => products.filter((p) => p.categorySlug === activeCategory), [products, activeCategory]);
  const featured = useMemo(
    () =>
      [...inCategory]
        .sort((a, b) => Number(hasRealImage(b)) - Number(hasRealImage(a)) || b.popularity - a.popularity || a.name.localeCompare(b.name))
        .slice(0, FEATURED),
    [inCategory]
  );
  const activeName = categories.find((c) => c.slug === activeCategory)?.name ?? "";

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
    update();
  }, [activeCategory, update]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = (card?.offsetWidth ?? 280) + 20;
    el.scrollBy({ left: dir * step * (window.innerWidth >= 1024 ? 3 : 1), behavior: reduce ? "auto" : "smooth" });
  };

  if (categories.length === 0) return null;

  return (
    <section className="py-20 lg:py-28" aria-label="Featured products">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          subtitle="Our Product Range"
          title="The Full Spectrum of Nature's Lab"
          description="Browse our comprehensive range of premium natural ingredients, each backed by rigorous quality testing and standardization."
        />

        {/* Category tabs: the active pill slides between them. */}
        <div role="tablist" aria-label="Product categories" className="no-scrollbar mt-12 flex items-center justify-start gap-1 overflow-x-auto rounded-full bg-gray-100/80 p-1 sm:mx-auto sm:w-fit sm:justify-center">
          {categories.map((cat) => {
            const active = activeCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(cat.slug)}
                className={cn(
                  "relative min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors sm:px-5",
                  active ? "text-white" : "text-gray-600 hover:text-gray-900"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="range-tab-pill"
                    className="absolute inset-0 rounded-full bg-emerald shadow-lg shadow-emerald/25"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Carousel */}
        <div className="relative mt-10">
          <div
            ref={scrollRef}
            onScroll={update}
            role="region"
            aria-roledescription="carousel"
            aria-label={`${activeName} products`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") scrollByCards(1);
              if (e.key === "ArrowLeft") scrollByCards(-1);
            }}
            className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-6 pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40 [mask-image:linear-gradient(90deg,transparent,#000_2%,#000_96%,transparent)]"
          >
            {featured.map((product, i) => (
              <QuickCard key={product.id} product={product} eager={i < 4} onAddToQuote={() => addItem(product)} />
            ))}
            <Link
              href={`/products/${activeCategory}`}
              data-card
              className="group flex w-[220px] flex-shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald/30 bg-emerald-50/50 p-6 text-center transition-colors hover:border-emerald hover:bg-emerald-50 sm:w-[260px]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-white transition-transform group-hover:translate-x-1">
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-bold text-emerald-800">See all {inCategory.length} {activeName.toLowerCase()}</span>
            </Link>
          </div>

          {/* Controls */}
          <div className="mt-2 flex items-center gap-4">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
              <div className="h-full rounded-full bg-emerald transition-[width] duration-150" style={{ width: `${Math.max(12, progress * 100)}%` }} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => scrollByCards(-1)}
                disabled={!canPrev}
                aria-label="Previous products"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-emerald hover:text-emerald disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollByCards(1)}
                disabled={!canNext}
                aria-label="Next products"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald text-white shadow-lg shadow-emerald/25 transition-all hover:bg-emerald-600 disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickCard({ product, eager, onAddToQuote }: { product: Product; eager: boolean; onAddToQuote: () => void }) {
  const href = `/products/${product.categorySlug}/${product.slug}`;
  return (
    <SpotlightCard
      className="group w-[240px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald/30 hover:shadow-xl hover:shadow-emerald/10 sm:w-[280px]"
    >
      <div data-card className="flex h-full flex-col">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <div className="relative h-44 overflow-hidden bg-emerald-50 sm:h-48">
            <ProductThumb product={product} sizes="280px" priority={eager} />
            {product.qualityBadges.length > 0 && (
              <div className="absolute right-3 top-3 flex gap-1">
                {product.qualityBadges.slice(0, 2).map((badge) => (
                  <span key={badge} className="rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-emerald shadow-sm">
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>
        <div className="flex flex-1 flex-col p-5">
          <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
            <h3 className="mb-1 line-clamp-2 text-sm font-bold text-gray-900 transition-colors group-hover:text-emerald">{product.name}</h3>
          </Link>
          {product.activeIngredient && (
            <p className="mb-3 line-clamp-2 text-xs text-gray-600">
              <span className="font-medium text-emerald">{product.activeIngredient}</span>
              {product.concentration && <span className="ml-1 text-gray-500">({product.concentration})</span>}
            </p>
          )}
          <div className="mt-auto flex items-center gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={onAddToQuote} className="flex-1 text-xs">
              Get Quote
            </Button>
            <Link
              href={href}
              aria-label={`View ${product.name}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-all hover:border-emerald hover:bg-emerald-50 hover:text-emerald sm:h-9 sm:w-9"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
