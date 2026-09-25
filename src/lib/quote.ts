import { z } from "zod";
import { fetchCatalogSnapshot, searchProducts } from "@/lib/catalog";

/**
 * Website quote requests.
 *
 * Every line a buyer submits is matched against the real catalogue on the
 * server, whatever the browser claimed: a product id is checked to exist,
 * and a typed name ("ashwaganda extract") goes through the same fuzzy
 * search the site search uses. A line that matches nothing is kept as
 * written and marked `matched: false`, so the team still sees it rather
 * than it being dropped.
 */

export const QUOTE_UNITS = ["kg", "g", "L", "ml", "MT", "units"] as const;
export const BUYER_TYPES = [
  "Manufacturer / Formulator",
  "Brand owner",
  "Trader / Distributor",
  "Researcher / Lab",
  "Other",
] as const;

const QuoteItemInput = z.object({
  productId: z.string().max(120).optional().nullable(),
  name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().positive().max(10_000_000).optional().nullable(),
  unit: z.enum(QUOTE_UNITS).optional().default("kg"),
  grade: z.string().trim().max(120).optional().nullable(),
});

export const QuoteRequestSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    company: z.string().trim().max(200).optional().default(""),
    email: z.string().trim().email("Enter a valid email address").max(254),
    phone: z.string().trim().max(40).optional().default(""),
    country: z.string().trim().max(80).optional().default(""),
    buyerType: z.enum(BUYER_TYPES).optional().nullable(),
    items: z.array(QuoteItemInput).max(50).optional().default([]),
    message: z.string().trim().max(5000).optional().default(""),
    wantsSamples: z.boolean().optional().default(false),
    // attribution, filled by the browser; never trusted for anything but reporting
    sourcePage: z.string().max(300).optional().nullable(),
    referrer: z.string().max(500).optional().nullable(),
    utm: z
      .object({
        source: z.string().max(120).optional().nullable(),
        medium: z.string().max(120).optional().nullable(),
        campaign: z.string().max(120).optional().nullable(),
      })
      .optional()
      .nullable(),
    // Honeypot (see /api/contact): accepted so the route can answer 200.
    company_website: z.string().max(200).optional().default(""),

    // ── Legacy contact-form fields (the old single-product form) ──
    product: z.string().trim().max(500).optional().default(""),
    quantity: z.string().trim().max(120).optional().default(""),
    description: z.string().trim().max(5000).optional().default(""),
    cartItems: z
      .array(z.object({ name: z.string().min(1).max(200), quantity: z.number().int().min(1).max(100000) }))
      .max(100)
      .optional()
      .default([]),
  })
  .strict()
  .refine((v) => v.items.length > 0 || v.message || v.description || v.product || v.cartItems.length > 0, {
    message: "Tell us which products you need, or add a message",
    path: ["items"],
  });

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export interface MatchedItem {
  productId: string | null;
  name: string;
  slug: string | null;
  category: string | null;
  categorySlug: string | null;
  quantity: number | null;
  unit: string;
  grade: string | null;
  matched: boolean;
  /** What the buyer typed, when it differs from the catalogue name. */
  requestedAs: string | null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(extract|powder|oil|standardi[sz]ed|pure|natural)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Dice coefficient on character bigrams: 1 = identical, 0 = nothing shared. */
function similarity(a: string, b: string): number {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const gx = grams(x), gy = grams(y);
  let overlap = 0;
  for (const [g, n] of gx) overlap += Math.min(n, gy.get(g) ?? 0);
  return (2 * overlap) / (x.length - 1 + y.length - 1);
}

/**
 * Normalises a submission (new multi-item form or the legacy one) into
 * catalogue-matched lines.
 */
export async function matchQuoteItems(req: QuoteRequest): Promise<MatchedItem[]> {
  const raw: z.infer<typeof QuoteItemInput>[] = [...req.items];

  if (raw.length === 0) {
    for (const c of req.cartItems) raw.push({ name: c.name, quantity: c.quantity, unit: "kg", productId: null, grade: null });
    if (raw.length === 0 && req.product) {
      for (const part of req.product.split(/,(?![^(]*\))/).map((p) => p.trim()).filter(Boolean).slice(0, 20)) {
        raw.push({ name: part.replace(/\s*\(x\d+\)\s*$/, ""), quantity: null, unit: "kg", productId: null, grade: null });
      }
    }
  }
  if (raw.length === 0) return [];

  let products: Awaited<ReturnType<typeof fetchCatalogSnapshot>>["products"] = [];
  try {
    products = (await fetchCatalogSnapshot()).products;
  } catch {
    // Catalogue unreachable: keep every line unmatched rather than fail the enquiry.
  }
  const byId = new Map(products.map((p) => [p.id, p]));

  const out: MatchedItem[] = [];
  for (const item of raw) {
    let product = item.productId ? byId.get(item.productId) : undefined;

    if (!product && products.length) {
      // 1) best name similarity across the whole catalogue
      let best: (typeof products)[number] | undefined;
      let bestScore = 0;
      for (const p of products) {
        const s = Math.max(similarity(item.name, p.name), p.botanicalName ? similarity(item.name, p.botanicalName) : 0);
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
      if (best && bestScore >= 0.72) product = best;
      // 2) the site's full-text + trigram search as a second opinion
      if (!product) {
        try {
          const [hit] = await searchProducts(item.name, 1);
          if (hit && similarity(item.name, hit.name) >= 0.5) product = byId.get(hit.id) ?? hit;
        } catch {
          /* search unavailable: leave unmatched */
        }
      }
    }

    out.push({
      productId: product?.id ?? null,
      name: product?.name ?? item.name,
      slug: product?.slug ?? null,
      category: product?.category ?? null,
      categorySlug: product?.categorySlug ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? "kg",
      grade: item.grade || null,
      matched: Boolean(product),
      // Shown to the team whenever the wording differed at all, so an
      // ambiguous match ("black pepper" → extract, not oil) is visible.
      requestedAs:
        product && product.name.toLowerCase().replace(/\s+/g, " ") !== item.name.toLowerCase().replace(/\s+/g, " ")
          ? item.name
          : null,
    });
  }
  return out;
}

export function formatQuantity(item: Pick<MatchedItem, "quantity" | "unit">): string {
  return item.quantity ? `${item.quantity.toLocaleString("en-IN")} ${item.unit}` : "Quantity to be discussed";
}
