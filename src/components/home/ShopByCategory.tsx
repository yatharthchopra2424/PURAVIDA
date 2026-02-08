"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { Category } from "@/types";

export function ShopByCategory({ categories }: { categories: Category[] }) {
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const featured = categories[featuredIdx];
  const supporting = categories.filter((_, i) => i !== featuredIdx).slice(0, 4);

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
          {/* Featured Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={featured.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-emerald p-8"
            >
              {/* Background pattern */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-25"
                style={{ backgroundImage: `url('${featured.image}')` }}
              />
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20" />
                <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/10" />
              </div>

              <div className="relative z-10">
                <Badge variant="category" className="mb-4 bg-white/10 text-white border-white/20">
                  {featured.label}
                </Badge>
                <h3 className="mb-3 text-3xl font-bold text-white">
                  {featured.name}
                </h3>
                <p className="mb-4 max-w-md text-sm leading-relaxed text-emerald-200">
                  {featured.description}
                </p>
                <div className="mb-6 flex flex-wrap gap-2">
                  {featured.exampleProducts.map((product) => (
                    <span
                      key={product}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs text-white"
                    >
                      {product}
                    </span>
                  ))}
                </div>
                <Button variant="primary" size="md" asChild>
                  <Link href={`/products/${featured.slug}`}>
                    View Category
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Supporting Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {supporting.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products/${cat.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-emerald/20 hover:shadow-lg"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-15"
                  style={{ backgroundImage: `url('${cat.image}')` }}
                />
                <div className="absolute inset-0 bg-white/60" />
                <div className="relative z-10">
                  <Badge variant="category" className="mb-3">
                    {cat.label}
                  </Badge>
                  <h4 className="mb-2 text-sm font-bold text-gray-900 group-hover:text-emerald transition-colors">
                    {cat.name}
                  </h4>
                  <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
                    {cat.description}
                  </p>
                </div>
                <div className="relative z-10 mt-4 flex items-center text-xs font-semibold text-orange-500 group-hover:text-orange-600">
                  Explore
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* View All */}
        <div className="mt-10 text-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="/products">
              View All Categories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
