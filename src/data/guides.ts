/**
 * Buyer guides. Each answers one question a purchasing manager or
 * formulator actually asks, in plain factual terms, so search and AI
 * engines can quote it. General industry knowledge only: no claims about
 * PuraVida's own specifications, prices or terms beyond what the site
 * already states elsewhere.
 */

export interface GuideSection {
  heading: string;
  body: string[]; // paragraphs
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** Short title for the browser tab and search results (about 45 characters). */
  metaTitle: string;
  /** 40–60 word direct answer, shown first and used as the meta description. */
  answer: string;
  published: string;
  sections: GuideSection[];
  related: { label: string; href: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "ashwagandha-extract-grades-explained",
    metaTitle: "Ashwagandha Extract Grades Explained",
    title: "Ashwagandha extract grades explained: withanolide percentages and what to ask for",
    answer:
      "Ashwagandha extract is sold by withanolide content, commonly 1.5%, 2.5%, 5% or 10%. A higher percentage means more of the marker compound per gram, not automatically a better product. Ask which plant part was used, which test method measured the withanolides, and for the batch certificate of analysis.",
    published: "2026-09-25",
    sections: [
      {
        heading: "What the percentage means",
        body: [
          "Withanolides are the group of active compounds used as the quality marker for ashwagandha (Withania somnifera). A grade of 5% means the extract is standardised so that about 5% of its weight is withanolides.",
          "Because the marker is measured, two suppliers can both sell \"5%\" and still differ in how it was measured and what else is in the powder.",
        ],
      },
      {
        heading: "Common grades",
        body: ["Grades in the market include:"],
        bullets: [
          "1.5% to 2.5%: the traditional strength, often from the root, common in general wellness capsules and powders.",
          "5%: a widely used middle grade for tablets and capsules where the dose needs to stay small.",
          "10% and above: concentrated grades; check the test method, because a very high figure by UV can read differently from the same material by HPLC.",
        ],
      },
      {
        heading: "Root or leaf",
        body: [
          "Traditional use centres on the root. Some extracts include leaf, which changes the withanolide profile. Ask which part was used and make sure it matches what your product label and your market's rules say.",
        ],
      },
      {
        heading: "Five things to ask any supplier",
        body: [],
        bullets: [
          "Which plant part, and is it root only?",
          "Which method measured the withanolides (HPLC or UV), and against which reference standard?",
          "Can I see the certificate of analysis for the batch I will receive?",
          "What is the carrier or excipient, if any (for example maltodextrin)?",
          "What are the heavy-metal, pesticide and microbial limits for the batch?",
        ],
      },
    ],
    related: [
      { label: "HPLC, UV and gravimetric: what your COA is really telling you", href: "/guides/hplc-vs-uv-vs-gravimetric-coa" },
      { label: "Ashwagandha extract specification", href: "/products/herbal-extracts/ashwagandha-extract" },
    ],
  },
  {
    slug: "hplc-vs-uv-vs-gravimetric-coa",
    metaTitle: "HPLC vs UV vs Gravimetric: Reading a COA",
    title: "HPLC, UV and gravimetric: what your certificate of analysis is really telling you",
    answer:
      "HPLC separates and measures individual compounds, UV measures the total of everything that absorbs light at a wavelength, and gravimetric methods weigh an extracted fraction. The same herbal extract can show different percentages by each method, so always compare grades measured by the same method.",
    published: "2026-09-25",
    sections: [
      {
        heading: "HPLC (high-performance liquid chromatography)",
        body: [
          "HPLC separates an extract into its individual compounds and measures each against a reference standard. It is the most specific of the three: if a specification says \"guggulsterones 2.5% by HPLC\", that figure refers to identified compounds.",
        ],
      },
      {
        heading: "UV spectrophotometry",
        body: [
          "UV measures how much light the sample absorbs at a chosen wavelength. It is quick and inexpensive, but it reports everything that absorbs there, so it can give a higher figure than HPLC for the same material. Anthocyanins and total flavonoids are often reported this way.",
        ],
      },
      {
        heading: "Gravimetric and titration methods",
        body: [
          "Gravimetric methods weigh a fraction after extraction or drying, for example total saponins or loss on drying. Titration is used for acids and similar assays. These give a total, not a breakdown.",
        ],
      },
      {
        heading: "Why it matters when you compare quotes",
        body: [
          "A 40% by UV and a 30% by HPLC can be the same material. When two suppliers quote different strengths, compare like with like: ask for the method on each specification, and for the batch certificate of analysis rather than a typical value.",
        ],
        bullets: [
          "Check the method named next to every percentage.",
          "Ask for the reference standard used.",
          "Compare the batch COA, not the brochure.",
        ],
      },
    ],
    related: [
      { label: "Ashwagandha extract grades explained", href: "/guides/ashwagandha-extract-grades-explained" },
      { label: "Herbal extracts", href: "/products/herbal-extracts" },
    ],
  },
  {
    slug: "importing-herbal-extracts-from-india-documents",
    metaTitle: "Importing Herbal Extracts from India: Documents",
    title: "Importing herbal extracts from India: the documents checklist",
    answer:
      "A typical shipment of herbal extracts from India travels with a commercial invoice, packing list, certificate of analysis, certificate of origin and a safety data sheet, plus Halal or other certificates if you need them. Your own country's import rules decide what else is required, so confirm with your customs broker before ordering.",
    published: "2026-09-25",
    sections: [
      {
        heading: "Documents from the supplier",
        body: ["Ask your Indian supplier to provide:"],
        bullets: [
          "Commercial invoice: product, quantity, value, shipping terms and the exporter's registration numbers.",
          "Packing list: number of packages, weights and batch numbers.",
          "Certificate of analysis (COA) for the batch shipped.",
          "Certificate of origin, when your customs or a trade agreement needs it.",
          "Specification sheet and safety data sheet (SDS/MSDS).",
          "Halal certificate or other product certificates, if your customer requires them.",
        ],
      },
      {
        heading: "What the importing side handles",
        body: [
          "Import rules differ by country and by how the product will be used (food supplement, cosmetic, pharmaceutical ingredient). Examples of things to check on your side: registration of the importer or facility, prior notification of food shipments, permitted-ingredient lists, and labelling rules.",
          "Your customs broker or regulatory adviser can confirm these. It is better to ask before placing the order than at the port.",
        ],
      },
      {
        heading: "Choosing shipping terms",
        body: [
          "Quotes should state the shipping term (for example FOB or CIF), the port, and who arranges insurance. Agree these in writing with the price, packing and validity of the quote.",
        ],
      },
      {
        heading: "Before you order",
        body: [],
        bullets: [
          "Tell the supplier your destination country and end use.",
          "Ask for a sample and its COA first.",
          "Confirm packing size and how the goods will be labelled.",
          "Ask for the lead time and the payment terms in writing.",
        ],
      },
    ],
    related: [
      { label: "Request an export quote", href: "/contact#quote" },
      { label: "Facility and registrations", href: "/facility" },
    ],
  },
  {
    slug: "oleoresin-vs-essential-oil-vs-extract",
    metaTitle: "Oleoresin vs Essential Oil vs Extract",
    title: "Oleoresin vs essential oil vs herbal extract: what is the difference?",
    answer:
      "An essential oil is the steam-distilled volatile fraction of a plant. An oleoresin is a solvent extract holding both the volatile oil and the resin, so it is stronger and closer to the whole spice. A herbal extract is a concentrate standardised to a marker compound, usually sold as a powder.",
    published: "2026-09-25",
    sections: [
      {
        heading: "Essential oil",
        body: [
          "Made by steam distillation or cold pressing. It carries the aroma and the volatile compounds, such as eugenol in clove or menthol in peppermint. It does not contain the heavier resin fraction.",
        ],
      },
      {
        heading: "Oleoresin",
        body: [
          "Made by extracting the spice or herb with a food-grade solvent and removing the solvent. The result contains the volatile oil and the resin: the pungency of pepper and chilli, the colour of paprika, the flavour of ginger. One kilogram of oleoresin replaces many kilograms of the raw spice and gives consistent strength.",
        ],
      },
      {
        heading: "Herbal extract",
        body: [
          "Usually made with water or alcohol, then concentrated and dried to a powder that is standardised to a marker, for example withanolides in ashwagandha or curcuminoids in turmeric. It is chosen for its active compounds rather than its flavour.",
        ],
      },
      {
        heading: "Which should I buy?",
        body: [],
        bullets: [
          "Aroma or fragrance: essential oil.",
          "Flavour, pungency or colour in food: oleoresin (or encapsulated oleoresin for dry blends).",
          "A defined amount of an active compound for supplements: standardised extract.",
        ],
      },
    ],
    related: [
      { label: "Encapsulated oleoresins", href: "/encapsulated-oleoresins" },
      { label: "Essential oils", href: "/products/essential-oils" },
    ],
  },
  {
    slug: "standardised-vs-full-spectrum-herbal-extract",
    metaTitle: "Standardised vs Full-Spectrum Herbal Extract",
    title: "Standardised vs full-spectrum herbal extract: which one do you need?",
    answer:
      "A standardised extract is adjusted so a named marker compound reaches a fixed percentage in every batch. A full-spectrum extract keeps the plant's natural mix of compounds without targeting one. Choose standardised when you need a repeatable dose and a specification; choose full-spectrum when the whole-plant profile is the point.",
    published: "2026-09-25",
    sections: [
      {
        heading: "Standardised extract",
        body: [
          "The extract is tested and blended so that one or more marker compounds meet a stated level, for example 95% curcuminoids or 10% withanolides. You can dose it precisely and compare batches and suppliers on the same number.",
        ],
      },
      {
        heading: "Full-spectrum extract",
        body: [
          "The extract keeps the plant's natural range of compounds in their natural proportions. The marker level is whatever the plant gave, so it varies more between batches, but the profile is closer to the whole herb.",
        ],
      },
      {
        heading: "How to decide",
        body: [],
        bullets: [
          "You are making a tablet or capsule with a label claim per dose: standardised.",
          "You need to pass a specification from a brand or a regulator: standardised.",
          "Your positioning is a traditional whole-herb product: full-spectrum, or a plain herb powder.",
        ],
      },
      {
        heading: "What to ask for either way",
        body: [
          "The plant part and botanical name, the extraction solvent, the marker and how it is measured, and the batch certificate of analysis.",
        ],
      },
    ],
    related: [
      { label: "HPLC, UV and gravimetric: reading a COA", href: "/guides/hplc-vs-uv-vs-gravimetric-coa" },
      { label: "Herbal extracts", href: "/products/herbal-extracts" },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
