"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { Category } from "@/types";

export function ShopByCategory({ categories }: { categories: Category[] }) {
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const featured = categories[featuredIdx];

  // Auto-rotate featured card
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIdx((prev) => (prev + 1) % categories.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [categories.length]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          subtitle="Shop By Category"
          title="Explore Our Product Families"
          description="From Essential Oils to Standardized Extracts: Ingredients that Elevate."
        />

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/*
            Featured card.
            The panel itself — background, scrim and CTA — is now static.
            Previously the whole motion.div (background included) faded
            out and back in on every 6s auto-rotate, so for ~0.5s in
            every 6s the entire card, its text and its button were
            washed out and unreadable. Only the copy cross-fades now.
          */}
          <div className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-emerald-700 p-8">
            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 transition-transform duration-[1.2s] ease-out group-hover:scale-105"
              style={{ backgroundImage: `url('${featured.image}')` }}
            />
            {/* Contrast scrim — guarantees white text stays legible
                regardless of which category image is showing. */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-900/55 to-emerald-800/30" />
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20" />
              <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/10" />
            </div>

            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={featured.slug}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.4 }}
                >
                  <Badge
                    variant="category"
                    className="mb-4 border-white/25 bg-white/15 text-white backdrop-blur-sm"
                  >
                    {featured.label}
                  </Badge>
                  <h3 className="mb-3 font-heading text-3xl font-black text-white drop-shadow-sm lg:text-4xl">
                    {featured.name}
                  </h3>
                  <p className="mb-5 max-w-md text-sm leading-relaxed text-white/85">
                    {featured.description}
                  </p>
                  <div className="mb-7 flex flex-wrap gap-2">
                    {featured.exampleProducts.map((product) => (
                      <span
                        key={product}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Solid white CTA: highest contrast against the green
                  panel, and it no longer animates with the copy. */}
              <Link
                href={`/products/${featured.slug}`}
                className="group/cta inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-emerald-800 shadow-xl shadow-emerald-950/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-700"
              >
                View Category
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Supporting Cards Grid — always shows all categories */}
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat, idx) => {
              const isActive = idx === featuredIdx;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setFeaturedIdx(idx)}
                  className={`
                    group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-6 text-left
                    transition-all duration-300 hover:shadow-lg
                    ${isActive
                      ? "border-emerald/50 shadow-md ring-2 ring-emerald/20"
                      : "border-gray-100 hover:border-emerald/20"
                    }
                  `}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-15"
                    style={{ backgroundImage: `url('${cat.image}')` }}
                  />
                  <div className="absolute inset-0 bg-white/60" />
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald" />
                  )}
                  <div className="relative z-10">
                    <Badge variant="category" className="mb-3">
                      {cat.label}
                    </Badge>
                    <h4 className={`mb-2 text-sm font-bold transition-colors ${isActive ? "text-emerald" : "text-gray-900 group-hover:text-emerald"}`}>
                      {cat.name}
                    </h4>
                    <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                  <div className={`relative z-10 mt-4 flex items-center text-xs font-semibold transition-colors ${isActive ? "text-orange-600" : "text-orange-500 group-hover:text-orange-600"}`}>
                    <Link href={`/products/${cat.slug}`} onClick={(e) => e.stopPropagation()} className="flex items-center">
                      Explore
                      <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* View All.
            Was a thin 2px outline button that read as disabled against
            the pale section background. Solid emerald gives it the
            weight a primary section CTA needs. */}
        <div className="mt-12 text-center">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 rounded-xl bg-emerald px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2"
          >
            View All Categories
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
