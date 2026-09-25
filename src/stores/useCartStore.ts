import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types";
import { track } from "@/lib/track";

export type QuoteUnit = "kg" | "g" | "L" | "ml" | "MT" | "units";

/**
 * One line of the quote cart. Only the product fields the drawer and the
 * form need are kept, so localStorage holds a few hundred bytes per line
 * instead of the whole product (descriptions, application lists…).
 */
export interface QuoteLine {
  product: Pick<Product, "id" | "name" | "slug" | "category" | "categorySlug" | "image" | "botanicalName">;
  quantity: number | null;
  unit: QuoteUnit;
  grade: string;
}

interface CartState {
  items: QuoteLine[];
  isOpen: boolean;
  /** Bumped on every add, so the header badge can replay its pop animation. */
  lastAddedAt: number;
  /** Adds a product (no-op if already there). Opens the drawer unless `open: false`. */
  addItem: (product: Product, quantity?: number, opts?: { open?: boolean }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number | null) => void;
  updateLine: (productId: string, patch: Partial<Pick<QuoteLine, "quantity" | "unit" | "grade">>) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  totalItems: () => number;
}

const slim = (p: Product): QuoteLine["product"] => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  category: p.category,
  categorySlug: p.categorySlug,
  image: p.image,
  botanicalName: p.botanicalName,
});

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      lastAddedAt: 0,
      // Adding opens the drawer: the old silent add left buyers thinking
      // the button did nothing.
      addItem: (product, quantity, opts) => {
        const existing = get().items.find((i) => i.product.id === product.id);
        if (!existing) track("add_to_quote", { product: product.slug });
        set({
          items: existing
            ? get().items
            : [...get().items, { product: slim(product), quantity: quantity ?? null, unit: "kg", grade: "" }],
          isOpen: opts?.open ?? true,
          lastAddedAt: Date.now(),
        });
      },
      removeItem: (productId) => set({ items: get().items.filter((i) => i.product.id !== productId) }),
      updateQuantity: (productId, quantity) => get().updateLine(productId, { quantity }),
      updateLine: (productId, patch) =>
        set({ items: get().items.map((i) => (i.product.id === productId ? { ...i, ...patch } : i)) }),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      totalItems: () => get().items.length,
    }),
    {
      name: "puravida-quote",
      version: 2,
      // Only the lines persist; the drawer always starts closed.
      partialize: (s) => ({ items: s.items }),
    }
  )
);
