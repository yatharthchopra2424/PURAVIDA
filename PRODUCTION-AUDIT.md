# PuraVida Natural — Production Readiness Audit

**Repo:** `puravida-new` · **Stack:** Next.js 14.2.35 (App Router), React 18, Supabase, Tailwind 3, Vercel
**Live:** https://www.puravidanaturalindia.com · **Audited:** 15 August 2026
**Scope:** all 98 source files, configs, SQL scripts, CI, dependency tree, plus live production verification

---

## Verdict

**Not production-ready in its current state.** The code compiles and the site is up, but three things are actively wrong right now:

1. **`npm run build` fails from a clean checkout.** A lint error blocks the production build. Vercel's next deploy from a fresh cache will fail.
2. **89% of the product catalog is dead in production.** 228 of 256 product URLs in your sitemap return "Product not found" — verified live.
3. **Your database is very likely world-writable.** `products` and `product_categories` have no RLS, and the key that reaches them ships in the browser bundle.

The good news: the architecture is sound, TypeScript is strict and passes cleanly, auth uses the correct `@supabase/ssr` patterns, and there is no injection or XSS surface. The problems are concentrated and fixable — mostly *wiring* mistakes rather than design mistakes. Roughly a week of focused work gets this to a genuinely solid production baseline.

**Do not start the Next.js 16 upgrade yet.** Fix the P0 list first; several P0s get harder to diagnose once the framework changes underneath them.

---

## Severity summary

| | Count | Meaning |
|---|---|---|
| **P0 — Critical** | 7 | Data loss, broken deploys, or lost revenue. Fix this week. |
| **P1 — High** | 11 | Security hardening, SEO, and performance. Fix this month. |
| **P2 — Medium** | 13 | Quality, maintainability, cost. Fix before scaling. |

---

# P0 — Critical

## P0-1 · Database tables have no Row Level Security

**Files:** `scripts/admin-schema.sql`, `src/lib/supabase-browser.ts:4-7`

`admin-schema.sql` enables RLS on `contacts` only. There is no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for `products` or `product_categories` anywhere in the repo.

Supabase grants `SELECT, INSERT, UPDATE, DELETE` to the `anon` and `authenticated` roles on public-schema tables by default. With RLS off, Postgres skips policy checks entirely — so any grant is a full grant. Your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is bundled into the client JavaScript (`supabase-browser.ts`), which means anyone who opens DevTools can read it and then issue a `DELETE` against your entire product catalog through the auto-generated REST API.

Supabase's own guidance is unambiguous: *"enable RLS on every table in your public schema. No exceptions."* The publishable key is only safe **because** RLS is assumed to be on.

**Verify first** — run in the Supabase SQL editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
```

Any row with `rowsecurity = false` is exposed.

**Fix:**

```sql
-- Catalog: public read, no public write
alter table public.products enable row level security;
alter table public.product_categories enable row level security;

create policy "Products are publicly readable"
  on public.products for select to anon, authenticated using (true);

create policy "Categories are publicly readable"
  on public.product_categories for select to anon, authenticated using (true);

-- No insert/update/delete policies = denied for anon and authenticated.
-- The admin panel keeps working because it uses the service-role key, which bypasses RLS.
```

Then open **Dashboard → Advisors → Security Advisor** and clear every warning. Also consider the event trigger from the Supabase docs that auto-enables RLS on any future table, so this cannot silently recur.

---

## P0-2 · The production build fails

**File:** `src/app/api/keepalive/route.ts:11`

```ts
const { data, error } = await supabase.from("products").select("id").limit(1);
```

`data` is never used. Your ESLint config extends `next/typescript`, which makes `@typescript-eslint/no-unused-vars` an **error**, and `next build` runs lint as a blocking step.

Verified locally:

```
Failed to compile.
./src/app/api/keepalive/route.ts
11:13  Error: 'data' is assigned a value but never used.
> Build failed because of webpack errors
```

The live site only exists because an older build is still cached. The next clean deploy fails.

**Fix:**

```ts
const { error } = await supabase.from("products").select("id").limit(1);
```

Then add a CI gate so this can never reach `main` again (see P1-11).

---

## P0-3 · 89% of product pages are broken in production

**Files:** `src/app/products/[category]/page.tsx:7-8`, `src/app/products/[category]/[slug]/page.tsx:8-9`, `src/data/products.ts`

This is the single most commercially damaging issue.

Two parallel data sources exist and the wrong one is wired up:

| Surface | Data source | Products |
|---|---|---|
| Homepage carousel | Supabase (`fetchCatalogSnapshot`) | ~250 |
| `sitemap.xml` | Supabase (`fetchCatalogSnapshot`) | 256 |
| **Category page** | **`src/data/products.ts` (hardcoded)** | **28** |
| **Product detail page** | **`src/data/products.ts` (hardcoded)** | **28** |

The homepage renders Supabase products and links to them. The detail page then looks those slugs up in a 28-item hardcoded array, doesn't find them, and renders "Product not found."

**Verified live:**
- `https://www.puravidanaturalindia.com/products/essential-oils/bergamot-oil` → **"Product not found"** — and that link is rendered by your own homepage.
- `/products/essential-oils` shows **5 products**; the homepage carousel shows **20** for the same category.

Cross-referencing your live sitemap against the static array:

```
sitemap product URLs:        256
resolve correctly:            28   (11%)
render "Product not found":  228   (89%)
```

It is worse than a 404, because these return **HTTP 200 with the generic site-wide title**. Google treats that as a soft 404 and as ~228 near-duplicate thin pages — actively harmful to domain quality, not merely neutral.

`src/app/products/[category]/CategoryClient.tsx` and `src/app/products/[category]/[slug]/ProductDetailClient.tsx` already exist and are **imported by nothing**. They appear to be the Supabase-backed versions that were written but never connected.

**Fix — convert both routes to Supabase-backed Server Components:**

```tsx
// src/app/products/[category]/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchProductBySlug, fetchCatalogSnapshot } from "@/lib/catalog";
import { ProductDetailClient } from "./ProductDetailClient";

export const revalidate = 3600;

export async function generateStaticParams() {
  const { products } = await fetchCatalogSnapshot();
  return products.map((p) => ({ category: p.categorySlug, slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: product.description.slice(0, 155),
    alternates: { canonical: `/products/${product.categorySlug}/${product.slug}` },
    openGraph: { title: product.name, description: product.description.slice(0, 155) },
  };
}

export default async function Page(
  { params }: { params: Promise<{ category: string; slug: string }> }
) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();          // ← real 404, not a 200
  return <ProductDetailClient product={product} />;
}
```

Then **delete `src/data/products.ts` and `src/data/categories.ts`** so the two sources can never drift again. (Keep `src/data/navigation.ts` — that one is legitimately static.)

This change alone converts ~250 dead URLs into ~250 indexable, server-rendered product pages with unique titles and descriptions. For a B2B catalog whose customers find it by searching ingredient names, that is the entire SEO surface of the business.

---

## P0-4 · Sitemap and robots.txt point at the wrong domain

**Files:** `src/app/sitemap.ts:4`, `src/app/robots.ts:9`

```ts
const BASE = "https://puravidanatural.com";        // sitemap.ts
sitemap: "https://puravidanatural.com/sitemap.xml" // robots.ts
```

The live site is `https://www.puravidanaturalindia.com`. Verified: every one of the 264 `<loc>` entries in your live sitemap points at a **different domain**. Google is being handed a sitemap for a site that isn't this one — so effectively zero of your URLs are being submitted, and any that are crawled look like off-domain duplicates.

**Fix** — drive it from an env var, set `NEXT_PUBLIC_SITE_URL=https://www.puravidanaturalindia.com` in Vercel, and add `metadataBase` to the root layout so all relative OG/canonical URLs resolve correctly:

```ts
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.puravidanaturalindia.com";
```

```ts
// src/app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.puravidanaturalindia.com"),
  // ...
};
```

Also add `disallow: "/x-admin"` to `robots.ts` — the admin login page is currently crawlable and only protected by a page-level `noindex`.

---

## P0-5 · Admin API grants access to *any* authenticated Supabase user

**File:** `src/lib/admin-auth.ts:40-49`, `src/middleware.ts:42`, `src/app/x-admin/layout.tsx:31`

```ts
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
return { user };
```

The check is "is there a valid session," not "is this person an admin." There is no role, allowlist, or claim check anywhere in the codebase.

If email signup is enabled on your Supabase project — it is **on by default** — anyone can register an account at your project's auth endpoint and immediately gain full CRUD over products, categories, and the entire customer inquiry inbox (names, emails, and quote history of every lead). All admin routes use the service-role client, so RLS offers no second line of defence.

**Verify:** Supabase Dashboard → Authentication → Providers → Email → check whether "Enable signup" is on, and review Authentication → Users for accounts you don't recognise.

**Fix — two layers.** First, disable public signup (Dashboard → Authentication → Providers → Email → **disable "Enable signup"**), then create admin users manually via the dashboard. Second, enforce it in code so the app doesn't depend on a dashboard toggle:

```ts
// src/lib/admin-auth.ts
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

// ...after the getUser() check:
if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

Apply the same guard in `middleware.ts` and `x-admin/layout.tsx`. A `profiles` table with a `role` column and an RLS-backed check is the more scalable version once you have more than one or two admins.

---

## P0-6 · Live admin credentials committed in plaintext

**File:** `.env:10-12`

```
# admin detailes
rk@puravida
Puravidaindia.Rk@23
```

Your production admin username and password are sitting in plaintext in a file in the project root, alongside `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SERVICE_KEY`.

`.env` is correctly gitignored and `git ls-files` confirms it was never committed — that is the one piece of good news here. But this file is on disk, gets copied with the folder, and will end up in any backup, sync, or screen share.

**Fix, in order:**
1. **Rotate the admin password now** via the Supabase dashboard. Treat it as compromised.
2. **Rotate `SUPABASE_SERVICE_ROLE_KEY`** (Dashboard → Settings → API → roll). It grants unrestricted database access and is in the same file.
3. Delete lines 10-12 from `.env`. Credentials belong in a password manager, never in a project file.
4. Add a committed `.env.example` listing key *names* with empty values, so onboarding doesn't require sharing real secrets.

Also: `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SERVICE_KEY` are both set and both used — `supabase-service.ts` reads the first, `supabase.ts` reads the second. Consolidate to one variable to avoid rotating one and missing the other.

---

## P0-7 · A Supabase outage breaks the build *and* every page

**Files:** `src/app/sitemap.ts:8`, `src/app/page.tsx:10`, `src/lib/catalog.ts` (throughout)

Every `catalog.ts` function rethrows on error, and no route wraps them. There is **no `error.tsx`, `not-found.tsx`, `loading.tsx`, or `global-error.tsx` anywhere in `src/app`** — confirmed, zero files.

Reproduced locally: with Supabase unreachable, `next build` dies at prerender:

```
Error occurred prerendering page "/sitemap.xml"
Error: TypeError: fetch failed
> Export encountered errors on following paths: /sitemap.xml/route
```

This is not hypothetical for you specifically: the `keepalive.yml` workflow exists precisely because your Supabase project pauses on idle. If it is paused or rate-limited during a deploy, **the deploy fails**. If it goes down at runtime, every page — all of them dynamic (see P1-1) — shows an unstyled Next.js error screen.

**Fix:** make `sitemap.ts` degrade gracefully, and add error boundaries.

```ts
// src/app/sitemap.ts
let categories: Category[] = [], products: Product[] = [];
try {
  ({ categories, products } = await fetchCatalogSnapshot());
} catch (e) {
  console.error("Sitemap: catalog fetch failed, emitting static pages only", e);
}
return [...staticPages, ...categoryPages, ...productPages];
```

Add `src/app/error.tsx`, `src/app/not-found.tsx`, and `src/app/global-error.tsx` with branded fallbacks. Also note the GitHub Actions keepalive is fragile: `curl` without `-f` exits 0 even on a 500, so a silently failing keepalive reports green. Add `--fail --retry 3`.

---

# P1 — High

## P1-1 · Zero pages are statically generated

**File:** `src/app/layout.tsx:122-123`

```ts
const headersList = await headers();
const pathname = headersList.get("x-invoke-path") ?? "";
```

Calling `headers()` in the **root layout** opts the entire application out of static rendering. Verified in the build output — every route is `ƒ (Dynamic)`, not one `○ (Static)`:

```
┌ ƒ /                              11.5 kB   192 kB
├ ƒ /about                         2.27 kB   134 kB
├ ƒ /products                        178 B    96 kB
├ ƒ /products/[category]           3.76 kB   183 kB
└ ƒ /products/[category]/[slug]    2.09 kB   154 kB
```

For a marketing and catalog site this is the wrong default on every axis: no CDN caching, a serverless invocation and a Supabase round-trip on every single page view, TTFB measured in hundreds of milliseconds instead of tens, and a Vercel bill that scales linearly with traffic instead of staying near zero.

The header call exists only to decide whether to render public chrome or admin chrome. That's a routing concern, and App Router solves it natively.

**Fix — use route groups and delete the `headers()` call entirely:**

```
src/app/
├── layout.tsx              ← minimal: <html>, <body>, fonts only
├── (public)/
│   ├── layout.tsx          ← TopBar, Header, Footer, SmoothScrollProvider
│   ├── page.tsx
│   ├── about/  contact/  products/
└── (admin)/
    └── x-admin/
        └── layout.tsx      ← admin chrome
```

Then add `export const revalidate = 3600` to catalog pages and `generateStaticParams` to `[category]` and `[slug]`. Combined with P0-3, this turns ~250 dynamic renders into ~250 ISR-cached static pages. Expect the largest single win in both Core Web Vitals and hosting cost of anything in this document.

You can also drop the `x-invoke-path` header from `middleware.ts:58` once this lands.

---

## P1-2 · Site header is invisible to search engines

**File:** `src/app/layout.tsx:63-74`

```tsx
const Header = dynamic(() => import("@/components/layout/Header")..., { ssr: false });
const MobileNav = dynamic(..., { ssr: false });
const CommandPalette = dynamic(..., { ssr: false });
```

`ssr: false` means the header — and with it your entire mega-menu internal linking structure — never appears in server-rendered HTML. Confirmed by fetching the live homepage: footer links are present in the HTML, header navigation is not.

Internal links are how crawlers discover and distribute authority across your category pages. Right now that entire layer is invisible.

This is also a **hard blocker for the Next.js 16 upgrade**: `ssr: false` in a Server Component throws `ssr: false is not allowed with next/dynamic in Server Components` in Next 15 and 16.

**Fix:** render `Header` normally — it is a Client Component, which already means its JS is client-side; `ssr: false` additionally suppresses the HTML, which is the part you don't want. If a specific child genuinely needs to be browser-only, isolate that child behind a `"use client"` wrapper that does the dynamic import internally.

---

## P1-3 · Mass assignment on admin PATCH endpoints

**Files:** `src/app/api/admin/products/[id]/route.ts:13-22`, `src/app/api/admin/categories/[id]/route.ts:13-22`

```ts
const body = await req.json();
const { data, error } = await supabase.from("products").update(body).eq("id", id)
```

The raw request body goes straight into the update. Any column is writable, including `id` itself — which lets a caller reassign a primary key and corrupt foreign-key relationships. There is no schema validation library in the project at all (no zod, yup, or valibot).

**Fix — add zod and an explicit allowlist:**

```ts
import { z } from "zod";

const ProductUpdate = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  category_id: z.string().uuid().optional(),
  botanical_name: z.string().max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  applications: z.array(z.string().max(100)).max(50).optional(),
  quality_badges: z.array(z.enum(["ISO","GMP","FSSAI","Halal","FDA","Export"])).optional(),
  is_halal: z.boolean().optional(),
  popularity: z.number().int().min(0).max(100).optional(),
}).strict();

const parsed = ProductUpdate.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
}
// ...update(parsed.data)
```

Apply the same treatment to the POST handlers and to `/api/contact`.

---

## P1-4 · Public contact endpoint has no rate limiting or validation

**File:** `src/app/api/contact/route.ts:9-14`

```ts
if (!name || !email) {
  return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
}
```

That is the entire validation. `email` is never checked for shape. There is no rate limiting anywhere in the codebase, no CAPTCHA, and no honeypot field.

The endpoint writes to your database with the **service-role client** and sends email through Resend. A trivial script can fill your inquiry inbox with thousands of junk rows, burn your Resend quota, and — because `replyTo` is attacker-controlled — use your domain to relay content to your own team.

Field lengths are also unbounded: `description` accepts a 10 MB string straight into Postgres.

**Fix:** zod-validate every field with length caps and `z.string().email()`; add `@upstash/ratelimit` with `@vercel/kv` (roughly 5 requests per IP per hour); add a hidden honeypot input that real users never fill. Also move `from: "onboarding@resend.dev"` (line 64) to a verified sending domain — `resend.dev` will land in spam and is not usable for production volume.

---

## P1-5 · No security headers at all

**File:** `next.config.mjs`

No `headers()` function. The app ships without CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` — the site is clickjackable and has no defence-in-depth against injected script.

**Fix** — per the Next.js CSP guide:

```js
const isDev = process.env.NODE_ENV === "development";

const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co;
  object-src 'none'; base-uri 'self'; form-action 'self';
  frame-ancestors 'none'; upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  }];
}
```

`'unsafe-inline'` on `script-src` is a compromise required by Next's inline bootstrap; the nonce-based middleware pattern in the Next docs is stricter if you want to go further later.

---

## P1-6 · Open redirect in the auth callback

**File:** `src/app/x-admin/auth/callback/route.ts:7,14`

```ts
const next = requestUrl.searchParams.get("next") ?? "/x-admin";
return NextResponse.redirect(new URL(next, requestUrl.origin));
```

`next` is unvalidated. `new URL("//evil.com", "https://yoursite.com")` resolves to `https://evil.com` — protocol-relative URLs escape the origin. An attacker can craft a link that looks like your admin domain and lands the victim on theirs, immediately after a successful login.

**Fix:**

```ts
const raw = requestUrl.searchParams.get("next") ?? "/x-admin";
const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/x-admin";
```

The same check should be applied to the `redirect` param in `x-admin/login/page.tsx:26`, which flows into `router.push()`.

---

## P1-7 · Search loads the entire catalog on every keystroke

**File:** `src/lib/catalog.ts:267-271`

```ts
const { data: productRows } = await supabase
  .from("products")
  .select("id, name, slug, category_id, botanical_name, ...")
  .order("popularity", { ascending: false })
  .limit(2000);
```

Every search request pulls up to 2,000 full product rows out of Postgres and scores them in Node. `/api/catalog/search` is `no-store`, so nothing is cached, and the command palette fires on input.

At ~250 products this is merely wasteful; it will not survive catalog growth or any real traffic, and it makes each keystroke a multi-hundred-millisecond round trip.

You already have `scripts/search-optimization.sql` in the repo — the Postgres FTS work appears to have been started and never wired up.

**Fix:** move scoring into Postgres with a `tsvector` column, a GIN index, and an RPC:

```sql
alter table products add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(botanical_name,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(active_ingredient,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'C')
  ) stored;

create index products_search_idx on products using gin(search_vector);
```

Then debounce the client input by ~200 ms and add `Cache-Control: s-maxage=60, stale-while-revalidate=300` to the search route.

---

## P1-8 · Contact form's product dropdown is permanently empty

**File:** `src/app/contact/page.tsx:33`, `src/app/api/catalog/products/route.ts:8-10`

```ts
const response = await fetch("/api/catalog/products");   // no ?category=
```

The route requires a `category` param and returns **400** without one. `response.ok` is false, the `catch` fires, and `setProductOptions([])` runs. Two bugs stacked: the route also returns `{ data: [...] }` while the client expects a bare array.

So on your primary lead-capture page, the "select a product" dropdown is always empty. For a quote-request business, this sits directly on the revenue path.

Notably `fetchProductNames()` exists in `catalog.ts:296` and is imported by nothing — it is exactly the function this call was meant to hit.

**Fix:** add `GET /api/catalog/product-names` backed by `fetchProductNames()`, return a bare array, and point the contact page at it.

---

## P1-9 · Hero images are 8 MB PNGs; `public/` is 101 MB

**Files:** `public/herosectioncarousel/*.png`

```
Ancient Meets Modern.png     7.9 MB
Extraction Technology.png    8.1 MB
Herbal Extraction.png        8.5 MB
```

All four hero slides are marked `priority` in `HeroCarousel.tsx:167`, so they are eagerly fetched. `next/image` does optimize these on the fly, but the source files still have to be read on every cache miss, they inflate the deployment bundle, and they are committed to git — meaning every clone pulls 101 MB and the repo carries that weight permanently.

**Fix:** re-encode the source images to WebP at roughly 1920 px wide (expect 200-400 KB each, a ~95% reduction). Keep `priority` on **slide 1 only** — the others are off-screen and are competing with your LCP element for bandwidth. Longer term, move `product_images/` (53 MB) to Supabase Storage, which you are already paying for and already using for admin uploads.

---

## P1-10 · Six font families loaded on every page

**File:** `src/app/layout.tsx:13-61`

Space Grotesk (4 weights), Inter (4), Plus Jakarta Sans (4), Open Sans (3), plus Geist Sans and Geist Mono variable fonts — all with `preload: true`. That is 19 font files competing for connections during initial render, and `next/font/google` fetches each at build time (a build-time network dependency, as the sandbox build failure demonstrated).

`tailwind.config.ts` shows only a subset is actually referenced.

**Fix:** cut to two families — one display, one body. Audit which `--font-*` variables are genuinely used in `globals.css` and `tailwind.config.ts` and delete the rest. Expect a meaningful LCP improvement on mobile.

---

## P1-11 · No CI, no tests, no typecheck gate

**File:** `.github/workflows/keepalive.yml` (the only workflow)

The single workflow pings a keepalive endpoint. Nothing runs `tsc`, `lint`, or `build` before merge — which is exactly how P0-2 shipped. There are no test files of any kind in the repo.

**Fix — add `.github/workflows/ci.yml`:**

```yaml
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Then add Playwright smoke tests for the paths that broke here: homepage renders, a product detail page resolves, contact form submits, admin routes redirect when logged out.

---

# P2 — Medium

## P2-1 · Next.js 14 is end-of-life

Next.js 14 reached EOL on **26 October 2025**. `14.2.35` (December 2025) was the final patch. It receives **no further security fixes**. Latest stable is **16.3.0** (August 2026).

You are on a framework that will accumulate unpatched CVEs indefinitely. The 14.x line was heavily affected by 2025 CVEs including CVE-2025-29927 (CVSS 9.1, middleware authorization bypass) — you are patched against that specific one, but there is no mechanism for the next one.

See the upgrade roadmap below.

## P2-2 · Nine npm vulnerabilities, six high

```
postcss  <=8.5.22   HIGH   XSS via unescaped </style>; path traversal via sourceMappingURL (×3)
uuid     <11.1.1    MOD    missing buffer bounds check
```

The postcss chain is pinned by Next 14 — `npm audit fix` reports the only resolution is `next@16.3.1`. This resolves itself with the framework upgrade.

## P2-3 · Ten unused dependencies, including all of Three.js

Verified by grep across `src/` — never imported:

`three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`, `@gsap/react`, `react-masonry-css`, `@radix-ui/react-dialog`, `@radix-ui/react-hover-card`, `@radix-ui/react-navigation-menu`, `geist`

The `src/shaders/` directory, the `.glsl/.vert/.frag` webpack rule in `next.config.mjs:16-21`, and `transpilePackages: ["three", "geist"]` are all dead weight supporting code that doesn't exist. `FluidBackground.tsx` is a 5-line file that re-exports the carousel; `FluidHero` is a misleading alias for `HeroCarousel`.

Removing these cuts install time substantially and eliminates a large chunk of the dependency-vulnerability surface.

## P2-4 · Public catalog reads use the service-role key

**File:** `src/lib/supabase.ts:4-6`

```ts
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
```

Every public catalog read — homepage, sitemap, search, footer — runs as service-role, bypassing RLS. It is server-side so not directly exploitable, but it means any future RLS policy silently won't apply to public reads, and any SSRF or injection bug escalates to full database access. Once P0-1 lands, switch public reads to the anon/publishable key and reserve service-role for `/api/admin/*` and `/api/contact`.

## P2-5 · Middleware runs Supabase auth on nearly every request

**File:** `src/middleware.ts:63-67`

The matcher excludes static assets but still matches all API routes and all public pages, and every match performs a network `getUser()` call to Supabase. That is added latency on every request plus avoidable auth-quota consumption — including on `/api/keepalive` and `/api/contact`, which have no session concept.

Narrow the matcher to `["/x-admin/:path*"]`.

## P2-6 · Image uploads trust the client-declared MIME type

**File:** `src/app/api/admin/upload-image/route.ts:31-37,54-57`

`file.type` is client-supplied and trivially spoofed. Combined with `upsert: true` and a filename derived from user input, an admin can silently overwrite any existing image in the bucket. Validate magic bytes rather than the declared type, and append a short hash or timestamp to the filename instead of upserting.

## P2-7 · CRLF line endings make every diff unreadable

No `.gitattributes` exists. `git diff` currently reports **every file as entirely rewritten** — `next.config.mjs`, `package.json`, and `src/app/page.tsx` are all CRLF while the committed versions are LF. This makes code review effectively impossible and will produce phantom conflicts the moment a second person touches the repo.

**Fix:** add `.gitattributes` with `* text=auto eol=lf`, then run `git add --renormalize .` and commit once.

## P2-8 · No observability

No Sentry, no error tracking, no structured logging, no analytics. `next.config.mjs:11` strips all `console` output in production, so runtime failures vanish silently — the contact-form bug (P1-8) and the 228 broken product pages (P0-3) could have run for months undetected.

Add `@sentry/nextjs` and Vercel Analytics. Given how much of this audit's findings were live production bugs, this is higher value than its P2 rating suggests.

## P2-9 · Placeholder business data on a live B2B site

`src/lib/constants.ts:42` has `iec: "0500XXXXXX"`, and the live homepage renders `GST Number: 07XXXXX1234X1ZX` while the footer shows the real `07ABCFP5743NIZS`. Two different GST numbers on one page, one of them obviously fake.

For an export business whose buyers verify credentials before ordering, this reads as a credibility problem. There is also a "Download Catalog" link pointing at `#`.

## P2-10 · No OG image

`layout.tsx:101-106` declares `twitter.card = "summary_large_image"` but no `openGraph.images` or `twitter.images` anywhere — confirmed absent from the live HTML. Every share on LinkedIn or WhatsApp renders as a bare text link. For B2B, where LinkedIn sharing matters, add `src/app/opengraph-image.tsx`.

## P2-11 · No structured data

No JSON-LD anywhere. A product catalog is the canonical use case for `Product` schema, and `Organization` schema drives the knowledge panel. Add both once P0-3 makes product pages server-rendered — the two changes compound.

## P2-12 · Accessibility gaps

Only 3 `aria-label` attributes across 42 client components. Icon-only buttons (carousel prev/next, password visibility toggle in `LoginForm.tsx:100`, mobile nav trigger) have no accessible name. No skip-to-content link. The `SmoothScrollProvider` (Lenis) hijacks scrolling without a `prefers-reduced-motion` guard, and framer-motion animations throughout don't check it either — a genuine vestibular-discomfort issue and a WCAG 2.1 AA failure.

Run axe DevTools once the P0 work lands.

## P2-13 · Minor correctness issues

- `src/lib/catalog.ts:119` — `fetchProductsByCategory` filters `.eq("category_id", categorySlug)`, comparing a slug against an ID column. Works only if `category_id` happens to store slugs; misleading either way.
- `src/app/api/admin/products/route.ts:10-11` — `parseInt` without radix or `NaN` guard; `?page=abc` produces `NaN` and a malformed range query.
- `README.md` is still the unmodified `create-next-app` boilerplate — no setup steps, no env var list, no deployment notes.
- `public/protucts.csv` — misspelled filename, and a 32 KB data file served publicly from `/protucts.csv`.

---

# Upgrade roadmap

Sequence matters. Each phase assumes the previous one is complete.

## Phase 0 — Stop the bleeding (this week)

| # | Task | Effort |
|---|---|---|
| P0-2 | Fix the lint error blocking builds | 5 min |
| P0-6 | Rotate admin password + service-role key, strip `.env` | 30 min |
| P0-1 | Enable RLS on `products` and `product_categories` | 1 hr |
| P0-5 | Disable public signup + add admin allowlist | 2 hrs |
| P0-4 | Correct sitemap/robots domain, add `metadataBase` | 30 min |
| P0-7 | Wrap sitemap in try/catch, add error boundaries | 2 hrs |

**~1 day.** After this the site is no longer at risk of catastrophic data loss or a failed deploy.

## Phase 1 — Fix what's costing you customers (week 1-2)

| # | Task | Effort |
|---|---|---|
| P0-3 | Wire product/category pages to Supabase; delete static data | 1-2 days |
| P1-8 | Fix the contact form product dropdown | 1 hr |
| P1-1 | Route groups; remove `headers()`; enable ISR | 1 day |
| P1-2 | Server-render the header | 2 hrs |
| P1-9 | Compress hero images | 2 hrs |

**~4 days.** This is where the commercial return is: ~250 dead URLs become indexable pages, the lead form works, and the site starts serving from CDN cache.

## Phase 2 — Harden (week 3)

P1-3 (zod validation) · P1-4 (rate limiting) · P1-5 (security headers) · P1-6 (open redirect) · P1-11 (CI pipeline) · P2-8 (Sentry)

**~3 days.**

## Phase 3 — Modernize (week 4+)

Only after Phases 0-2 are done and stable.

**Next.js 14 → 16** — run `npx @next/codemod@canary upgrade latest`. Known blockers in your code:
- `dynamic(..., { ssr: false })` in `layout.tsx` — **already fixed by P1-2**
- Async `params`/`searchParams` — your code already awaits these correctly
- `next.config.mjs` — `experimental.optimizeCss` has moved; `critters` can be dropped
- Caching semantics changed in 15; audit each `revalidate` after upgrading

Resolves all six high-severity postcss advisories (P2-2) and returns you to a supported release line.

**React 18 → 19** — ships with Next 16. Check framer-motion and cmdk peer ranges; both have React 19-compatible releases.

**Tailwind 3 → 4** — latest is 4.3. Config moves from `tailwind.config.ts` to CSS `@theme`. Independent of the Next upgrade; do it separately. Build performance improvement is substantial.

**Supabase SSR 0.9 → 0.12** — small, low-risk, do it early.

**Remove dead dependencies** (P2-3) — do this *before* the Next upgrade so you aren't debugging Three.js peer conflicts for code you don't use.

**Do not upgrade** `three`/`@react-three/*` — delete them instead.

---

# What's already good

Worth stating plainly, because the list above is long:

- **TypeScript is strict and passes cleanly** — `tsc --noEmit` exits 0 across ~10,000 lines, with no `any`, no `@ts-ignore`, no `as any`.
- **Auth uses the correct modern patterns** — `@supabase/ssr` with `getAll`/`setAll` cookie handling, `getUser()` rather than `getSession()` for verification, and a middleware refresh. This is the current recommended approach, not a legacy one.
- **No injection or XSS surface** — zero `dangerouslySetInnerHTML`, no raw SQL string building, all queries go through the Supabase client.
- **Service-role isolation is correctly reasoned** — `supabase-service.ts` carries an explicit warning comment and is never imported client-side. Verified.
- **Clean, consistent architecture** — sensible separation of `lib`/`hooks`/`stores`/`types`, coherent component organization, no circular dependencies.
- **The admin panel is genuinely well-built** — pagination, search, filtering, image upload with size and type checks, and a settings page with password change and global sign-out.
- **Image optimization is thoughtfully configured** — AVIF/WebP, sensible `deviceSizes` and `imageSizes`.
- **`.env` was never committed** — `git ls-files` confirms it. The gitignore was right from the first commit.

The foundation is solid. Nearly every P0 here is a wiring mistake — two data sources where there should be one, a missing role check, a missing RLS statement — rather than anything structural. That is a much better position to be in than it looks from the severity counts.

---

## Sources

- [Next.js 16.3 release](https://nextjs.org/blog/next-16-3)
- [Next.js EOL dates: version support timeline](https://www.herodevs.com/blog-posts/nextjs-eol-dates-version-support-timeline)
- [Next.js EOL / support policy discussion](https://github.com/vercel/next.js/discussions/85289)
- [Supabase — Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — Row Level Security](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx)
- [Supabase — API keys and publishable key safety](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/getting-started/api-keys.mdx)
- [Supabase — Going into production checklist](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/deployment/going-into-prod.mdx)
- [Next.js — Content Security Policy guide](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/content-security-policy.mdx)
- [Next.js — Lazy loading / `ssr: false` in Server Components](https://nextjs.org/docs/app/guides/lazy-loading)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [Disabling RLS in Supabase: what it exposes](https://www.guardlayer.io/blog/supabase-rls-disabled)
