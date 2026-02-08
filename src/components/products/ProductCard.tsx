"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Product } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MagneticWrapper } from "@/components/ui/MagneticWrapper";
import { useCartStore } from "@/stores/useCartStore";

interface ProductCardProps {
  product: Product;
  highlight?: boolean;
}

const badgeVariantMap: Record<string, "iso" | "gmp" | "fssai" | "halal" | "fda" | "export"> = {
  ISO: "iso",
  GMP: "gmp",
  FSSAI: "fssai",
  Halal: "halal",
  FDA: "fda",
  Export: "export",
};

export function ProductCard({ product, highlight = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <MagneticWrapper strength={0.12}>
      <motion.div
        layoutId={`product-card-${product.slug}`}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "50px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-lg ${
          highlight
            ? "border-emerald ring-2 ring-emerald/20 animate-pulse-border"
            : "border-gray-100 hover:border-emerald/20"
        }`}
        style={{ willChange: highlight ? "transform" : "auto" }}
      >
        {/* Image Area */}
        <Link href={`/products/${product.categorySlug}/${product.slug}`}>
          <motion.div
            layoutId={`product-image-${product.slug}`}
            className="relative h-48 flex items-center justify-center overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${product.image}')` }}
            />
            <div className="absolute inset-0 bg-emerald/10" />
            <div className="text-center p-4 transition-transform duration-300 group-hover:scale-110">
              <span className="text-4xl">🌿</span>
              <p className="mt-2 text-xs font-medium text-emerald-600">
                {product.category}
              </p>
            </div>

            {/* Quality badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1">
              {product.qualityBadges.slice(0, 3).map((badge) => (
                <Badge key={badge} variant={badgeVariantMap[badge] || "default"} className="text-[9px] px-1.5 py-0 shadow-sm">
                  {badge}
                </Badge>
              ))}
            </div>

            {product.isHalal && (
              <span className="absolute top-3 right-3 rounded-md bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700 shadow-sm">
                Halal
              </span>
            )}
          </motion.div>
        </Link>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <Link href={`/products/${product.categorySlug}/${product.slug}`}>
            <h3 className="mb-1 text-base font-bold text-gray-900 transition-colors group-hover:text-emerald">
              {product.name}
            </h3>
          </Link>

          {product.botanicalName && (
            <p className="mb-1 text-xs italic text-gray-700">
              {product.botanicalName}
            </p>
          )}

          {product.activeIngredient && (
            <p className="mb-2 text-xs text-black">
              Active:{" "}
              <span className="font-semibold text-emerald">
                {product.activeIngredient}
              </span>
              {product.concentration && (
                <span className="ml-1 text-gray-600">
                  ({product.concentration})
                </span>
              )}
            </p>
          )}

          <div className="mb-4 flex flex-wrap gap-1">
            {product.applications.slice(0, 3).map((app) => (
              <span
                key={app}
                className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
              >
                {app}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => addItem(product)}
              className="flex-1 text-xs"
            >
              Get Quote
            </Button>
            <Link
              href={`/products/${product.categorySlug}/${product.slug}`}
              className="rounded-lg border border-gray-200 p-2 text-gray-400 transition-all hover:border-emerald hover:text-emerald"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    </MagneticWrapper>
  );
}
