"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Droplets, FlaskConical, Leaf, Pill } from "lucide-react";
import { Product } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { useCartStore } from "@/stores/useCartStore";
import { PRODUCT_FALLBACK_IMAGE } from "@/lib/constants";

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

/** Placeholder art for the ~20% of products without a photo: category icon on a tinted gradient. */
function NoPhoto({ product }: { product: Product }) {
  const c = product.category.toLowerCase();
  const Icon = c.includes("essential") ? Droplets : c.includes("oleoresin") ? FlaskConical : c.includes("nutraceutical") ? Pill : Leaf;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-emerald shadow-sm ring-1 ring-emerald-100 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <span className="px-4 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70">{product.category}</span>
    </div>
  );
}

export function ProductCard({ product, highlight = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const hasRealImage = product.image !== PRODUCT_FALLBACK_IMAGE;
  const href = `/products/${product.categorySlug}/${product.slug}`;

  return (
    // cv-auto: off-screen cards aren't rendered until they scroll near, which
    // keeps 140+ card category pages fast.
    <SpotlightCard
      className={`cv-auto group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald/10 ${
        highlight ? "border-emerald ring-2 ring-emerald/20 animate-pulse-border" : "border-gray-100 hover:border-emerald/30"
      }`}
    >
      <div className="flex h-full flex-col">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <div className="relative h-36 overflow-hidden bg-emerald-50 sm:h-44">
            {hasRealImage ? (
              <Image
                src={product.image}
                alt={`${product.name}${product.botanicalName ? ` (${product.botanicalName})` : ""}, ${product.category}`}
                fill
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <NoPhoto product={product} />
            )}

            <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
              {product.qualityBadges.slice(0, 3).map((badge) => (
                <Badge key={badge} variant={badgeVariantMap[badge] || "default"} className="px-1.5 py-0 text-[9px] shadow-sm">
                  {badge}
                </Badge>
              ))}
            </div>
            {product.isHalal && (
              <span className="absolute right-2.5 top-2.5 rounded-md bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700 shadow-sm">Halal</span>
            )}
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-3.5 sm:p-5">
          <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
            <h3 className="mb-1 line-clamp-2 text-sm font-bold text-gray-900 transition-colors group-hover:text-emerald sm:text-base">{product.name}</h3>
          </Link>

          {product.botanicalName && <p className="mb-1 line-clamp-1 text-xs italic text-gray-500">{product.botanicalName}</p>}

          {product.activeIngredient && (
            <p className="mb-2 line-clamp-2 text-xs text-gray-600">
              <span className="font-semibold text-emerald">{product.activeIngredient}</span>
              {product.concentration && <span className="ml-1 text-gray-500">({product.concentration})</span>}
            </p>
          )}

          <div className="mb-4 hidden flex-wrap gap-1 sm:flex">
            {product.applications.slice(0, 3).map((app) => (
              <span key={app} className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">
                {app}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={() => addItem(product)} className="flex-1 text-xs">
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
