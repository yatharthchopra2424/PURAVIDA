import { fetchCatalogSnapshot } from "@/lib/catalog";
import { COMPANY } from "@/lib/constants";
import { absoluteUrl } from "@/lib/site";
import { GUIDES } from "@/data/guides";

/**
 * /llms.txt and /llms-full.txt: plain-markdown descriptions of the
 * company and catalogue for AI assistants (llmstxt.org convention).
 * Built from the live catalogue and the verified company facts only; no
 * marketing claims an assistant could repeat that aren't backed by a
 * document.
 */

const facts = () => [
  `- Legal name: ${COMPANY.legalName} (${COMPANY.constitution})`,
  `- Address: Plot No. 169, 170, 171, Khushi Ram Park, Uttam Nagar West, New Delhi 110059, India`,
  `- GSTIN: ${COMPANY.gst}`,
  `- FSSAI licence: ${COMPANY.fssaiLicense} (State licence, Delhi)`,
  `- Udyam (MSME) registration: ${COMPANY.udyam}`,
  `- Halal: Halal India certificate HIW28020819 covers the products on the Halal product list`,
  `- Sales email: ${COMPANY.salesEmail} · Phone: ${COMPANY.phone} · Hours: ${COMPANY.hours}`,
  `- Request a quote: ${absoluteUrl("/contact")}`,
];

export async function renderLlmsTxt(full: boolean): Promise<string> {
  let categories: Awaited<ReturnType<typeof fetchCatalogSnapshot>>["categories"] = [];
  let products: Awaited<ReturnType<typeof fetchCatalogSnapshot>>["products"] = [];
  try {
    ({ categories, products } = await fetchCatalogSnapshot());
  } catch {
    /* catalogue unreachable: still serve the company facts */
  }

  const lines: string[] = [
    `# ${COMPANY.name}`,
    "",
    `> ${COMPANY.legalName} is a New Delhi, India based supplier of standardised herbal extracts, essential oils, oleoresins and nutraceutical ingredients for manufacturers, brands and traders in India and abroad. It also markets the Selvasoul range of retail health supplements. Buyers request pricing, MOQ and specifications through the quote form.`,
    "",
    "## Company facts (verifiable)",
    ...facts(),
    "",
    "## Key pages",
    `- [Product catalogue](${absoluteUrl("/products")}): all ${products.length || "250+"} ingredients by category`,
    ...categories.map((c) => `- [${c.name}](${absoluteUrl(`/products/${c.slug}`)}): ${c.description}`),
    `- [Request a quote](${absoluteUrl("/contact")}): multi-product quote form, reply within one business day`,
    `- [Facility & certification](${absoluteUrl("/facility")}): registrations and quality process`,
    `- [Encapsulated oleoresins](${absoluteUrl("/encapsulated-oleoresins")}): free-flowing oleoresin powders for masala, seasoning and tea blends`,
    `- [Selvasoul Digestive Fiber Blend](${absoluteUrl("/selvasoul-digestive-fiber-blend")}): retail isabgol & saunf supplement sold on Amazon India`,
    `- [About](${absoluteUrl("/about")})`,
    "",
    "## Buyer guides",
    ...GUIDES.map((g) => `- [${g.title}](${absoluteUrl(`/guides/${g.slug}`)}): ${g.answer}`),
    "",
  ];

  if (!full) {
    lines.push("## Optional", `- [Full catalogue with specifications](${absoluteUrl("/llms-full.txt")})`);
    return lines.join("\n") + "\n";
  }

  lines.push("## Full catalogue", "");
  for (const c of categories) {
    const inCat = products.filter((p) => p.categorySlug === c.slug);
    if (!inCat.length) continue;
    lines.push(`### ${c.name}`, "");
    for (const p of inCat) {
      const spec = [
        p.botanicalName && `botanical name: ${p.botanicalName}`,
        p.activeIngredient && `active: ${p.activeIngredient}`,
        p.concentration && `standardisation: ${p.concentration}`,
        p.applications.length && `applications: ${p.applications.slice(0, 5).join(", ")}`,
        p.isHalal && "Halal certified",
      ]
        .filter(Boolean)
        .join("; ");
      lines.push(`- [${p.name}](${absoluteUrl(`/products/${p.categorySlug}/${p.slug}`)})${spec ? `: ${spec}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}
