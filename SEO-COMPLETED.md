# SEO Completion + Dev Warning Fixes

**Date:** 15 August 2026
**Verification:** `tsc --noEmit` → 0 · `eslint .` → 0 · `next build` → green, **0 warnings**, 0 errors

SEO is now complete. Everything below was verified against a running server, and the
generated share images were rendered and visually checked, not just status-code tested.

---

## First — the two warnings from your dev log

### `images.qualities` — a bug I introduced
```
Image ... is using quality "82" which is not configured in images.qualities [75]
```
Next 16 requires every `quality` value used in the app to be declared. I set `quality={82}`
on the hero carousel during P1-9 without declaring it, so Next fell back to 75 and warned on
every image. Added `qualities: [75, 82]`.

### `turbopack.root`
```
Next.js ignored package-lock.json in D:\Current Projects because it is outside
the current Git repository
```
There is a stray lockfile in the parent folder. Next walked up, found it, and warned on
every dev start. Pinned `turbopack.root` to the project directory.

Both gone — the build now reports **zero warnings**.

---

## SEO work

### Open Graph images — dynamically generated
Your layout declared `twitter:card = summary_large_image` but no image existed, so every
LinkedIn and WhatsApp share rendered as a bare text link.

Two generators, no design assets to maintain:

- **`src/app/opengraph-image.tsx`** — sitewide card: brand mark, headline, product families,
  and the ISO/GMP/FSSAI credentials.
- **`src/app/(public)/products/[category]/[slug]/opengraph-image.tsx`** — a card **per
  product**, carrying its name, botanical name, active ingredient and concentration. So
  sharing "Bergamot Oil" shows *Bergamot Oil · Citrus bergamia · Active: Limonene · 30-45%*,
  not a generic banner. That is the detail a B2B buyer scans for.

Verified: both return `200 image/png` (98 KB and 76 KB) and were rendered and inspected.

> One gotcha worth recording: Satori (the renderer behind `next/og`) requires an explicit
> `display` on any element with more than one child. A `<br />` inside the headline failed
> the build with *"Expected `<div>` to have explicit display: flex"*. Replaced with a flex
> column of two lines.

### Structured data — Organization, WebSite, Breadcrumb, ItemList
Previously only `Product` schema existed, inline in one page. Now centralised in
`src/lib/structured-data.ts`, emitted through a small `<JsonLd>` component that escapes `<`
so product copy can never break out of the script tag.

| Schema | Where | What it does |
|---|---|---|
| `Organization` | every public page | Knowledge-panel signal: address, GST, certifications, contact point |
| `WebSite` | every public page | Ties the site to the organisation |
| `Product` | product pages | Rich results on ingredient searches |
| `BreadcrumbList` | product + category | Readable hierarchy in results instead of a raw URL |
| `CollectionPage` + `ItemList` | category pages | Explains the catalog structure |

Nodes are linked by `@id` rather than duplicated, so `Product.manufacturer` points at the
same `Organization` the homepage declares — which is what Google wants to see.

Verified in served HTML:
```
homepage    Organization: 1   WebSite: 1
product     Product: 1        BreadcrumbList: 1   Organization: 1
category    CollectionPage: 1 ItemList: 1         BreadcrumbList: 1
```

### Business data — the two GST numbers
Your homepage showed `07XXXXX1234X1ZX` while the footer showed the real
`07ABCFP5743NIZS` — two different GST numbers on the same page, one obviously fake, on a
site whose buyers verify credentials.

`businessProfile` now reads from `COMPANY` in `src/lib/constants.ts`, so they cannot
disagree again. Verified: fake GST occurrences `0`, real GST present.

**The IEC row is removed.** You said "use the real GST everywhere" but didn't give me an
IEC, and `0500XXXXXX` is visibly a placeholder — worse than showing nothing. It's gone from
the homepage table, the footer, and `constants.ts`, each with a comment marking where to
restore it. Give me the real code and it's a two-line change.

---

## Also fixed: the duplicate API calls in your log

Your dev output showed this on a single page load:
```
GET /api/catalog/categories 200 in 978ms
GET /api/catalog/categories 200 in 1319ms
GET /api/catalog/categories 200 in 1322ms
GET /api/catalog/categories 200 in 1888ms
```

Two causes, both fixed:

1. **`useCategories` fetched per component.** MegaMenu and MobileNav each ran their own
   request. The hook now shares one module-level cache and de-duplicates in-flight requests,
   so it fetches once per page load regardless of how many components ask.
2. **The route was uncacheable.** `/api/catalog/categories` was `force-dynamic` +
   `revalidate = 0` + `no-store`, so every navigation hit Supabase afresh. Categories change
   rarely; it now sends `s-maxage=3600, stale-while-revalidate=86400`.

> While fixing this I hit React 19's `set-state-in-effect` rule in my own new hook — the
> warm-cache branch wrote state the `useState` initialiser had already set. Removed rather
> than suppressed.

---

## Full verification output

```
── OG images ──
  og:image (site)     https://www.puravidanaturalindia.com/opengraph-image
  /opengraph-image    200  image/png  100673 bytes
  og:image (product)  .../products/essential-oils/bergamot-oil/opengraph-image-...

── Structured data ──
  homepage    Organization: 1  WebSite: 1
  product     Product: 1  Breadcrumb: 1  Organization: 1
  category    CollectionPage: 1  ItemList: 1  Breadcrumb: 1

── Metadata ──
  <title>Bergamot Oil | PuraVida Natural</title>
  canonical: https://www.puravidanaturalindia.com/products/essential-oils/bergamot-oil
  twitter:card: summary_large_image

── Business data ──
  fake GST on homepage: 0    real GST present: 3    fake IEC: 0

── Build ──
  Compiled successfully   0 warnings   0 errors
```

---

## Deploy checklist

1. `npm install` — `next.config.mjs` changed and the lockfile is current.
2. **Vercel → Settings → General → Node.js Version → 22.x** (Next 16 needs ≥ 20.9).
3. Env vars: `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `SUPABASE_SERVICE_ROLE_KEY`,
   `CONTACT_EMAIL`, plus `VERCEL_DEPLOY_HOOK_URL` once you create the hook.
4. SQL, in order: `scripts/enable-rls.sql`, then `scripts/search-fulltext.sql`.
5. Supabase → Authentication → Providers → Email → **disable signup**.
6. Rotate the admin password and service-role key (both were in plaintext).
7. Deploy to a **preview** first.

### After deploying

- **Rich Results Test** — https://search.google.com/test/rich-results
  Paste a product URL. Expect Product + BreadcrumbList to validate.
- **Sharing Debugger** — LinkedIn Post Inspector or
  https://developers.facebook.com/tools/debug/ to confirm the OG card renders.
- **Search Console** — submit `https://www.puravidanaturalindia.com/sitemap.xml`. This is
  effectively a first submission, since the old sitemap pointed at a different domain.
  Then watch Coverage for the ~250 product URLs; indexing takes days to weeks.

---

## What's genuinely left

SEO is done. Remaining items from the original audit, none blocking:

- **P2-8 · Observability** — the highest-value item now. Production `console.error`/`warn`
  survive, so Sentry has somewhere to hook in. Most of this engagement's findings were live
  bugs nobody knew about; this is how you find the next one.
- **P2-4 · Public reads still use the service-role key** — safe to switch to the anon key
  now that RLS is enabled. `TODO` marks the spot in `src/lib/supabase.ts`.
- **P2-12 · Accessibility** — skip link and landmarks landed with P1-1; icon-button labels
  and a `prefers-reduced-motion` guard remain.
- **Tailwind 3 → 4** — deliberately separate so visual regressions stay attributable.
- **Real IEC number** — restore the row when you have it.
