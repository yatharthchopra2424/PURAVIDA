# Plan 3: SEO, GEO and AEO (search and AI visibility)

## Status (25 Sep 2026): code complete for phases A–C; content review and off-site steps pending

| Item | State |
|---|---|
| Product descriptions (was "Details coming soon" on 243 pages) | ✅ every product has a factual description built from its own data |
| Specification table + buyer FAQ + FAQPage schema on **all 256** product pages | ✅ `src/lib/product-content.ts`, `ProductInsights` |
| Export-angled titles ("X: Bulk Supplier & Exporter, India") | ✅ |
| Encapsulated oleoresins page (`/encapsulated-oleoresins`) with the 20 oleoresins, FAQ, ItemList + FAQPage schema | ✅ |
| 5 buyer guides (`/guides`) with Article schema, in sitemap and llms.txt | ✅ ashwagandha grades · HPLC vs UV vs gravimetric · importing from India · oleoresin vs essential oil vs extract · standardised vs full-spectrum |
| `llms.txt`, AI crawlers, identifiers in schema | ✅ (earlier) |
| **Your review of the wording** | ⏳ see "Please check" in the hand-off; guides are general industry knowledge, not your own specs |
| Request indexing in Search Console (home, Rhodiola, Bilberry, Guggul, encapsulated page) | ⏳ you, after deploy |
| Bing Webmaster Tools, Google Business Profile, IndiaMART/TradeIndia profiles | ⏳ you |
| Real commercial data per product (grades, MOQ, packing, lead time) | ⏳ needs your spreadsheet; pages say "confirmed in your quote" until then |
| 5 more guides (private label, essential oil grades, moringa, piperine, MOQ) | later |
| Monthly AI-visibility check (30 buyer prompts) | later |


Date: 25 Sep 2026

- **SEO**: rank in Google and Bing.
- **GEO** (Generative Engine Optimization): be named and cited by ChatGPT, Perplexity, Gemini, Copilot and Claude when a buyer asks "who supplies X".
- **AEO** (Answer Engine Optimization): be the quoted answer in Google AI Overviews, featured snippets and voice answers.

The three overlap: all of them reward **specific, factual, well-structured pages from a verifiable business**.

---

## 1. Where the site stands (audited 25 Sep 2026)

| Check | Status |
|---|---|
| Sitemap | ✅ 268 URLs (8 static, 4 categories, 256 products), refreshed hourly |
| robots.txt | ✅ Correct; blocks `/x-admin` and `/api` |
| Canonical URLs, titles, Product/Organization JSON-LD | ✅ Present |
| **Product content** | ❌ **243 of 256 products (95%) are "Details coming soon" or under 120 characters**, and that text is also inside the Product schema |
| `llms.txt` / AI-readable catalogue | ❌ Missing (404) |
| FAQ / answer content | ❌ None |
| Trust facts | ⚠️ Wrong GSTIN (fixed) and legal status (fixed); unverifiable turnover, headcount and "est. 2000" still live |
| Analytics / Search Console | ❌ No data flowing (see Plan 1, Phase 2) |
| Bing Webmaster Tools | ❌ Not set up. **This matters: ChatGPT search and Copilot are built on Bing's index** |

Competitors that rank for "ashwagandha extract manufacturer India" (Himalayan Herbaria, Sivaroma, Grenera, Medikonda) all publish, per product: standardisation grades (e.g. withanolides 1.5 / 2.5 / 5 / 10 %), test method (HPLC / gravimetric), COA per batch, MSDS, packing (25 kg HDPE drums / fibre drums) and MOQ. That is the bar.

---

## 1b. Google Search Console (last 3 months, exported 25 Sep 2026)

| Signal | Data | Meaning / action |
|---|---|---|
| Indexed vs not | **56 indexed, 212 "Discovered – currently not indexed"**, 3 "page with redirect" | Google found the product pages but didn't think them worth crawling (thin "Details coming soon" pages on a young domain). ✅ Every product now has a factual description built from its botanical name, standardisation and applications. Next: full content (section 2), internal links, then "Request indexing" for the top 40 in Search Console. The 3 redirects are the http/non-www versions and are fine. |
| Clicks | 17 in 3 months, almost all the home page | Nearly all search traffic is people who already know the name |
| Top query | "pura vida natural": 3 clicks, position 4.6 | Brand search works; misspellings ("purivada", "puraveda") also reach you |
| Non-brand queries | "encapsulated oleoresin supplier/company", "encapsulated asafoetida / tea masala oleoresin" (≈23 impressions), "rhodiola extract", "bilberry extract", "guggul extract" | Real buyer searches where the site ranks at **position 60–90** (page 7–9). No encapsulated oleoresin product exists in the catalogue: **if you supply encapsulated oleoresins, a dedicated page is the fastest win.** Rhodiola, bilberry and guggul get the first full product pages. |
| Countries | India 125 impressions (17 clicks); **USA 47 impressions at position 10.8, 0 clicks**; 30 more countries | Overseas buyers see the site on page 1–2 but don't click: the titles and descriptions need an export angle ("exporter", "bulk", "COA") |
| Device | Mobile position 14.6, desktop 25.4 | Mobile ranks better; keep the mobile fixes |
| Breadcrumbs | 3 valid, 0 invalid | Breadcrumb schema is working |

## 2. Content: all 256 product pages

### How the content is produced (legally)
- **Not copied.** Competitor wording is copyrighted; copying it is infringement, and Google filters duplicate text anyway. Their pages are used only to decide *which facts* a buyer expects.
- **Facts are free to use:** botanical name, plant part, marker compounds, standard test methods (USP / IP / BP monographs name HPLC, UV, gravimetric), typical appearance and solubility, typical applications and regulatory status. These come from public references (pharmacopoeias, the WHO monographs on medicinal plants, PubChem, FSSAI schedules).
- **Written fresh:** I generate original text per product with a fixed template, grounded only in those facts and your data, then run a check that no sentence matches competitor pages.
- **Anything commercial comes from you, never invented:** grades you actually supply, MOQ, packing, lead time, price basis. Until you confirm them, the page says "on request".

### Page template (each product)
1. **H1**: "{Product} ({Botanical name}) Manufacturer & Exporter in India"
2. **Answer paragraph (40–60 words)**: what it is, standardised to what, used for what. This is the AEO block that AI engines lift.
3. **Specification table**: botanical name, part used, marker compound and %, method, appearance, solubility, mesh, loss on drying, heavy metals / microbial "as per specification on COA", packing, shelf life, storage.
4. **Grades available** (from you), with a "Request quote for this grade" button per grade.
5. **Applications**: nutraceutical, pharma, cosmetic, food and beverage, with 1–2 lines each.
6. **Documentation**: COA, MSDS, spec sheet, Halal list (if applicable), all "available on request".
7. **FAQ (4–6 questions)**: "What is the difference between 2.5% and 5% withanolide grades?", "What is the MOQ?", "Do you export to the USA / EU?", "Is it Halal certified?". These are marked up as `FAQPage`.
8. **Related products** and a link to the relevant guide page.

**Rollout:** the 40 highest-demand products first (ashwagandha, curcumin / turmeric, boswellia, moringa, garcinia, green tea, ginseng, tribulus, bacopa, shatavari, amla, neem, black pepper / piperine, fenugreek, giloy, and the 20 essential oils), then the rest in batches of 50, each batch reviewed by your team before publishing.

---

## 3. Technical SEO work

- Product schema gains `additionalProperty` (specs), `brand`, `manufacturer`, `countryOfOrigin: IN`, `isRelatedTo`, and `offers` (`availability`, `priceSpecification: "on request"`).
- `FAQPage` on products and guides; `BreadcrumbList` everywhere; `Organization` gains `legalName: Pura Vida Natural LLP`, `taxID` (GSTIN), `identifier` (FSSAI), `address`, `contactPoint`, `sameAs` (LinkedIn, IndiaMART, Amazon brand page).
- **Category pages** get 300–500 words of real buying guidance, not filler.
- **hreflang** is not needed yet (English only); add it only if Arabic or Spanish pages are made later.
- Core Web Vitals: see UI plan (image sizes, the 31 s `/about` issue).
- **IndexNow** ping on every product publish (Bing and Yandex pick up changes in minutes).
- Internal linking: every product links to its category and one guide; every guide links to 5–10 products.

---

## 4. GEO: getting cited by AI engines

**✅ Done 25 Sep 2026:** `/llms.txt` and `/llms-full.txt` (generated hourly from the live catalogue, 295 lines), robots.txt names and allows 14 AI crawlers, Organization schema now carries `legalName`, GSTIN, FSSAI and Udyam identifiers plus the Selvasoul brand, and unverified ISO/GMP credentials were removed from the schema. The Selvasoul page ships Product + FAQPage + HowTo + BreadcrumbList.

**Content source found:** `public/Product List & Certificates/Product List.pdf` (13 pages, your own) lists botanical name, active ingredient with standardisation range and application per product. The 256 product pages will be written from it, which removes most of what section 7 asked of you.

1. **`/llms.txt`**: a plain-language map of the company and catalogue (who we are, verification numbers, categories, links to the product list). Plus **`/llms-full.txt`**: the full catalogue with specs as markdown, regenerated from the database.
2. **robots.txt explicitly welcomes AI crawlers**: `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Bingbot`, `Applebot-Extended`.
3. **Answer-first writing**: every page opens with the direct factual answer, then the detail. No slogans ("Cured by nature. Perfected by science." gives an AI nothing to quote).
4. **Entity consistency**: the same name, address, phone and GSTIN everywhere (site, Google Business Profile, IndiaMART, TradeIndia, LinkedIn, Amazon). AI engines trust facts that match across several sources.
5. **Guide pages AI engines like to cite** (10 to start):
   - How to choose an ashwagandha extract: withanolide grades explained
   - Curcumin 95% vs turmeric extract vs turmeric oleoresin
   - HPLC vs UV vs gravimetric: what the COA method means
   - Importing herbal extracts from India: documents checklist (COA, MSDS, phytosanitary, Halal, FSSAI, IEC)
   - Essential oil grades: therapeutic, food and cosmetic
   - Standardised extract vs full-spectrum extract
   - MOQ, packing and lead times for botanical extracts (your real numbers)
   - Piperine / black pepper extract for bioavailability
   - Moringa leaf powder vs extract
   - Private label nutraceuticals from India: how it works
6. **Visibility tracking**: a monthly check of 30 buyer prompts ("best ashwagandha extract supplier in India", "curcumin 95 manufacturer Delhi"…) across ChatGPT, Perplexity and Gemini, logged in the Traffic portal. The AI-referral sources in the Traffic portal show the result.

## 5. AEO: owning the answer box
- A 40–60-word definition block at the top of every product and guide.
- Question-style H2s ("What is the MOQ for…?").
- Comparison tables (Google lifts tables into snippets).
- `FAQPage` and `HowTo` (for "how to use" on the Selvasoul page).

---

## 6. Off-site (needs you; highest value per hour)
| Platform | Why | Action |
|---|---|---|
| Google Search Console | See queries and rankings; submit sitemap | Verify the domain (DNS TXT record) → add me as a user or share the JSON key |
| **Bing Webmaster Tools** | Feeds ChatGPT search and Copilot | Import from Search Console (1 click) |
| Google Business Profile | Local pack and AI trust | Create at the Uttam Nagar address, category "Manufacturer / Wholesaler" |
| IndiaMART / TradeIndia / ExportersIndia | B2B buyers search here and AI engines read them | Profiles with the same facts and a website link |
| LinkedIn company page | Entity signal | Same facts |
| Amazon Brand Registry (Selvasoul) | Brand store and Amazon Attribution | Needs the trademark application number |

---

## 7. What I need from you (the only blockers)

1. **Per product family, your real commercial facts**: grades or standardisation you actually supply, MOQ, packing, lead time. A rough spreadsheet is fine; I'll give you a template with the 256 products pre-filled.
2. **The company facts to show**: real year started (the documents say LLP registered 2022), whether to keep "100–500 employees" and "₹50–100 Cr" (the Udyam certificate says *Micro*, so I recommend removing both), and whether you manufacture or source (Udyam lists *Trading* as the major activity).
3. **ISO / GMP / FDA / Halal certificates**, if you have them, as PDFs in `private-docs/legal/`. **If you don't have them, those claims must come off the site.** Unbacked certification claims are the fastest way to lose a buyer and an AI engine's trust.
4. Search Console access and a Bing Webmaster Tools login.
5. The WhatsApp business number.
6. Optional: the Selvasoul trademark number (for Amazon Brand Registry).

## 8. Order
1. Fix trust facts (partly done) → 2. `llms.txt`, robots and schema (1 day) → 3. top 40 products (2 days, with your review) → 4. guides (2 days) → 5. remaining 216 products in batches → 6. monthly AI-visibility checks.
