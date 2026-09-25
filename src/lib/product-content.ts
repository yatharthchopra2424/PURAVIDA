import type { Product } from "@/types";
import { COMPANY } from "@/lib/constants";

/**
 * Data-driven content for every product page.
 *
 * The catalogue has botanical name, active ingredient (with its
 * standardisation and test method) and applications for all 256 products,
 * but a written description for only 13. Rather than leave 243 thin
 * pages, each page gets a specification table and buyer FAQ built from
 * those fields. Nothing is invented: a row or question appears only when
 * the data behind it exists, and commercial terms (price, MOQ, packing)
 * are never stated, only "confirmed in your quote".
 */

export interface SpecRow {
  label: string;
  value: string;
}
export interface FaqItem {
  q: string;
  a: string;
}

const kindOf = (p: Product): "oil" | "oleoresin" | "nutraceutical" | "extract" => {
  const c = p.category.toLowerCase();
  if (c.includes("essential")) return "oil";
  if (c.includes("oleoresin")) return "oleoresin";
  if (c.includes("nutraceutical")) return "nutraceutical";
  return "extract";
};

/** The test method named in the standardisation, e.g. "… by HPLC" or "(UV)". */
function methodOf(active: string | undefined): string | null {
  const m = active?.match(/\b(HPLC|UV|GC-MS|GC|TLC|Gravimetric|Titration|HPTLC)\b/i);
  return m ? m[1].toUpperCase() : null;
}

export function buildSpecRows(p: Product): SpecRow[] {
  const kind = kindOf(p);
  const rows: SpecRow[] = [
    { label: "Product", value: p.name },
    { label: "Category", value: p.category },
  ];
  if (p.botanicalName) rows.push({ label: "Botanical name", value: p.botanicalName });
  const active = p.concentration ? `${p.activeIngredient ?? ""} ${p.concentration}`.trim() : p.activeIngredient;
  if (active) {
    rows.push({
      label: kind === "oil" ? "Key constituents" : kind === "extract" ? "Standardised to" : "Active / assay",
      value: active,
    });
  }
  const method = methodOf(p.activeIngredient);
  if (method) rows.push({ label: "Test method", value: method });
  if (p.applications.length) rows.push({ label: "Applications", value: p.applications.join(", ") });
  if (p.isHalal) rows.push({ label: "Halal", value: "On our Halal India certified product list" });
  rows.push({ label: "Packing, MOQ, lead time", value: "Confirmed in your quote" });
  rows.push({ label: "Documents", value: "Certificate of analysis on request" });
  return rows;
}

export function buildFaq(p: Product): FaqItem[] {
  const kind = kindOf(p);
  const noun = kind === "oil" ? "essential oil" : kind === "oleoresin" ? "oleoresin" : kind === "nutraceutical" ? "nutraceutical ingredient" : "herbal extract";
  const active = p.concentration ? `${p.activeIngredient ?? ""} ${p.concentration}`.trim() : p.activeIngredient;
  const items: FaqItem[] = [];

  items.push({
    q: `What is ${p.name}?`,
    a: `${p.name} is a ${noun}${p.botanicalName ? ` obtained from ${p.botanicalName}` : ""}.${
      active ? ` Our specification lists ${active}.` : ""
    }${p.applications.length ? ` It is used in ${p.applications.slice(0, 4).join(", ").toLowerCase()}.` : ""}`,
  });

  if (active) {
    const method = methodOf(p.activeIngredient);
    items.push({
      q: `What is ${p.name} standardised to?`,
      a: `${active}${method ? `, verified by ${method}` : ""}. Exact grades and the test method for your batch are stated on the certificate of analysis, which we can share on request.`,
    });
  }

  if (p.applications.length) {
    items.push({
      q: `What is ${p.name} used for?`,
      a: `Typical application areas are ${p.applications.join(", ").toLowerCase()}. Which of these suits your product depends on your formulation and the regulations in your market, so please confirm claims with your regulatory adviser.`,
    });
  }

  items.push({
    q: `Do you supply ${p.name} in bulk and for export?`,
    a: `Yes. ${COMPANY.legalName} supplies ${p.name} in bulk from New Delhi to manufacturers, brands and traders in India, and exports it to buyers overseas. Send the quantity and destination through the quote form and we reply with price, MOQ, packing and specifications within one business day.`,
  });

  items.push({
    q: `Can I get a certificate of analysis or a sample of ${p.name}?`,
    a: `A certificate of analysis is available on request, and we can discuss samples for evaluation when you request a quote.`,
  });

  if (p.isHalal) {
    items.push({
      q: `Is ${p.name} Halal certified?`,
      a: `${p.name} is on our Halal product list under Halal India certificate HIW28020819. Ask us for the current list with your quote.`,
    });
  }

  return items;
}

/** Title with an export angle; the layout appends " | PuraVida Natural". */
export function buildTitle(p: Product): string {
  const t = `${p.name}: Bulk Supplier & Exporter, India`;
  return t.length <= 52 ? t : `${p.name}: Bulk Supplier, India`;
}
