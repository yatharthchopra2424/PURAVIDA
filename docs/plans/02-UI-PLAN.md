# Plan 2: UI and animation overhaul

Date: 25 Sep 2026 · Method: full-page screenshots of 13 pages at 1440 px (desktop) and 390 px (phone), headless Chrome against the live site, plus a script that measured every button, tap target and overflow. The screenshots are in the session scratchpad; they are re-taken after every phase for before/after comparison.

---

## A. Defects found (fix first, in this order)

| # | Defect | Where | Measured | Fix |
|---|---|---|---|---|
| 1 | **Large buttons collapse** | "Request Quote" (product page), "Send Inquiry" (contact) and every `size="lg"` | 426×**28 px** and 186×**24 px** | ✅ FIXED: `Button` used `h-13`, which doesn't exist in Tailwind 3, so no height was applied. Now `h-[3.25rem]` (52 px) |
| 2 | **Mobile header overflows**: search and menu buttons are pushed off-screen on the home page | `/` at 390 px | 5 elements wider than the viewport | ✅ FIXED: responsive logo (160 px on phones), 44×44 buttons; verified at 360/390/430 px with no overflow |
| 3 | Empty "Quality Assurance" box | 241 of 256 product pages | only 15 products have badges | ✅ FIXED: the box now always shows the FSSAI licence, COA on request and samples |
| 4 | ~~Related products show blank grey boxes~~ | product pages | **Not a bug:** images load with real scrolling; the blank boxes were an artifact of my screenshot script (Lenis smooth-scroll ignores programmatic scrolling) | No change; the screenshot script now uses real wheel scrolling |
| 5 | Footer logo is a blank white square | every page | 36×36 white box | ✅ FIXED: white knock-out wordmark |
| 6 | "Get Quote" gives no feedback | cards | click → only a tiny badge | ✅ FIXED: slide-over quote drawer and animated header badge (Plan 1 §1.1) |
| 7 | Category page 63,000 px tall on a phone | `/products/herbal-extracts` (142 items) | – | Filter chips (by application or compound), search in category, "Load 24 more" |
| 8 | ~~`/about` takes ~31 s to settle~~ | `/about` | re-tested: page load 0.7 s, no hanging requests | **Not a bug:** a one-off serverless cold start during the first audit |
| 9 | Two `<h1>` on home; none on `/contact` | – | – | ✅ FIXED on /contact (one H1, own title and description); home still to do |
| 10 | Breadcrumb wraps mid-trail on a phone | product pages | – | Single line with horizontal scroll and ellipsis on the middle crumbs |
| 11 | Tap targets under 32 px | 12–26 per page | – | Minimum 44×44 px on touch |
| 12 | "Details coming soon." shown to buyers | 243 products | – | Plan 3 content; meanwhile show a spec table built from the known fields |

---

## B. Design system upgrade

**Buttons**: one `Button` with variants `primary` (orange), `secondary` (green), `outline`, `ghost`, `link` and sizes `sm 40 / md 44 / lg 52 / xl 56`. All get:
- a **shine sweep** on hover (a gradient pseudo-element, CSS only)
- a **press** state (`scale .97`) and a **loading** state (spinner and disabled, width locked so it doesn't jump)
- `icon` / `iconRight` slots with a slide-on-hover arrow
- a visible focus ring and 44 px minimum on touch

**Tokens**: move colours, radii, shadows and motion durations into `tailwind.config.ts` theme tokens (currently hard-coded hex values across files).

**Typography**: Space Grotesk headings and Inter body stay; fix the heading scale (clamp-based fluid sizes) so phone headings don't break into three lines.

---

## C. Animation library plan

Everything below is copy-in source built on **framer-motion + Tailwind**, which are already installed. No new heavy dependencies; each component is adapted to Tailwind 3 and the brand colours.

| Component | Source | Where it goes |
|---|---|---|
| Shimmer / shine button | Magic UI "Shimmer Button", Aceternity "Moving Border" | Primary CTAs (Request Quote, Send Inquiry) |
| Animated number ticker | Magic UI "Number Ticker" | Stats row (countries, products, years) |
| Marquee | Magic UI "Marquee" | Certification strip and "industries we serve" logos |
| Bento grid | Magic UI "Bento Grid" | Home "Why choose us" (replaces 6 equal cards) |
| Spotlight / glow card | Aceternity "Card Spotlight" | Product cards (cursor-following glow) |
| Text reveal / blur-in | Magic UI "Blur Fade", "Text Animate" | Section headings on scroll |
| Animated tabs | 21st.dev animated tabs | Category filter chips; Website Leads status tabs |
| Slide-over drawer | Vaul-style drawer via framer-motion | Quote cart |
| Toast | Sonner-style (≈3 kB) | "Added to quote" and form results |
| Border beam | Magic UI "Border Beam" | The quote form card, to draw the eye |
| Dot / grid background | Magic UI "Dot Pattern" | Hero sections of inner pages |
| Page transitions | framer-motion `AnimatePresence` | Route changes (subtle 150 ms fade) |

**Rules so it stays fast and professional:**
- Everything respects `prefers-reduced-motion`.
- Animate only `transform` and `opacity`; nothing that causes layout reflow.
- Animations start **in view** (IntersectionObserver), once, never on loop, except the marquee.
- Motion budget: at most 1 attention-grabbing effect per viewport. This is a B2B supplier, not a gaming site.
- Lighthouse target after the overhaul: Performance ≥ 90 on phone, CLS < 0.05.

---

## D. Page-by-page improvements

- **Home**: tighter hero with a quote CTA and a WhatsApp button; a proof bar (FSSAI · Halal · COA per batch · export countries); category bento; top 8 products; "How ordering works" (enquiry → quote → sample → order) as a 4-step animated timeline; FAQ.
- **Category pages**: sticky filter bar, search inside the category, a table/grid toggle (buyers compare specs in a table), and a "Compare" checkbox on up to 3 products.
- **Product pages**: spec table (botanical name, part used, standardisation, method, appearance, solubility, packing, shelf life, MOQ), a sticky "Request quote" bar on phones, FAQ accordion, "Documents available: COA · MSDS · Spec sheet", and related products with real images.
- **Contact / quote**: the new form (Plan 1), with a side card showing response time, WhatsApp and office map.
- **About / Facility**: remove the unverifiable claims (see the open questions in Plan 1), add a photo gallery lightbox of the factory images, and show the registrations block (done).
- **404**: search box and top categories.
- **Admin**: same button and toast system; Website Leads and Traffic pages (Plan 1).

---

## E. Verification each phase
1. Re-run the screenshot and measurement script (all pages × 2 widths) and compare before and after.
2. No element wider than the viewport; no button under 44 px on touch; exactly 1 H1 per page.
3. Lighthouse on phone for home, category, product and contact.
4. Keyboard-only walkthrough of the quote flow.
