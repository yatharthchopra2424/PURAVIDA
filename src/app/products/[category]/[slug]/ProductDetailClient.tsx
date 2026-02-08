"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Category, Product } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useCartStore } from "@/stores/useCartStore";

const badgeVariantMap: Record<string, "iso" | "gmp" | "fssai" | "halal" | "fda" | "export"> = {
  ISO: "iso",
  GMP: "gmp",
  FSSAI: "fssai",
  Halal: "halal",
  FDA: "fda",
  Export: "export",
};

export function ProductDetailClient({
  product,
  category,
  relatedProducts,
}: {
  product: Product;
  category: Category;
  relatedProducts: Product[];
}) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-emerald">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/products"
            className="transition-colors hover:text-emerald"
          >
            Products
          </Link>
          <span>/</span>
          <Link
            href={`/products/${category.slug}`}
            className="transition-colors hover:text-emerald"
          >
            {category.name}
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">{product.name}</span>
        </nav>

        {/* Product Detail */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left: Image */}
          <motion.div
            layoutId={`product-image-${product.slug}`}
            className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${product.image}')` }}
            />
            <div className="absolute inset-0 bg-emerald/10" />
            <div className="relative text-center">
              <span className="text-8xl">🌿</span>
              <p className="mt-4 text-lg font-medium text-emerald-600">
                {product.category}
              </p>
            </div>
            {/* Badges overlay */}
            <div className="absolute top-6 left-6 flex flex-wrap gap-2">
              {product.qualityBadges.map((badge) => (
                <Badge
                  key={badge}
                  variant={badgeVariantMap[badge] || "default"}
                  className="shadow-md text-xs px-2.5 py-1"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          </motion.div>

          {/* Right: Details */}
          <div className="flex flex-col">
            <Badge variant="category" className="mb-4 self-start">
              {category.label}
            </Badge>

            <h1 className="mb-2 text-3xl font-bold text-gray-900 lg:text-4xl">
              {product.name}
            </h1>

            {product.botanicalName && (
              <p className="mb-4 text-base italic text-gray-500">
                {product.botanicalName}
              </p>
            )}

            <p className="mb-8 text-base leading-relaxed text-gray-600">
              {product.description}
            </p>

            {/* Specifications */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              {product.activeIngredient && (
                <SpecRow label="Active Ingredient" value={product.activeIngredient} />
              )}
              {product.activeCompound && (
                <SpecRow label="Active Compound" value={product.activeCompound} />
              )}
              {product.concentration && (
                <SpecRow label="Concentration" value={product.concentration} />
              )}
              <SpecRow label="Category" value={product.category} />
            </div>

            {/* Applications */}
            <div className="mb-8">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Applications
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.applications.map((app) => (
                  <span
                    key={app}
                    className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald"
                  >
                    {app}
                  </span>
                ))}
              </div>
            </div>

            {/* Quality Assurance */}
            <div className="mb-8 rounded-xl bg-gray-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-emerald" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Quality Assurance
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.qualityBadges.map((badge) => (
                  <Badge key={badge} variant={badgeVariantMap[badge] || "default"}>
                    {badge} Certified
                  </Badge>
                ))}
                {product.isHalal && (
                  <Badge variant="halal">Halal Certified</Badge>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => addItem(product)}
                className="flex-1"
              >
                Request Quote
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Related Products
              </h2>
              <Link
                href={`/products/${category.slug}`}
                className="text-sm font-semibold text-orange-500 hover:text-orange-600"
              >
                View All <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <RelatedCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function RelatedCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.categorySlug}/${product.slug}`}
      className="group rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-emerald/20 hover:shadow-md"
    >
      <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-emerald-50 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${product.image}')` }}
        />
        <div className="absolute inset-0 bg-emerald/10" />
        <span className="relative z-10 text-3xl">🌿</span>
      </div>
      <h4 className="text-sm font-bold text-gray-900 group-hover:text-emerald transition-colors">
        {product.name}
      </h4>
      <p className="mt-1 text-xs text-gray-500">
        {product.activeIngredient || product.category}
      </p>
    </Link>
  );
}
