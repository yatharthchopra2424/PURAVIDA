import Image from "next/image";
import { Droplets, FlaskConical, Leaf, Pill } from "lucide-react";
import type { Product } from "@/types";
import { PRODUCT_FALLBACK_IMAGE } from "@/lib/constants";

export const hasRealImage = (p: Pick<Product, "image">) => p.image !== PRODUCT_FALLBACK_IMAGE;

/**
 * The product picture, or designed placeholder art when the product has no
 * photo yet (category icon on a tinted gradient). Fills its parent, which
 * must be `relative` with a fixed height.
 */
export function ProductThumb({ product, sizes, priority = false }: { product: Product; sizes: string; priority?: boolean }) {
  if (hasRealImage(product)) {
    return (
      <Image
        src={product.image}
        alt={`${product.name}${product.botanicalName ? ` (${product.botanicalName})` : ""}, ${product.category}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-500 group-hover:scale-110"
      />
    );
  }
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
