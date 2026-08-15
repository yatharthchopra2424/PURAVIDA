# P1 Remediation — Completed

**Date:** 15 August 2026 · **Scope:** all 11 P1 findings from `PRODUCTION-AUDIT.md`

**Verification:** `tsc --noEmit` → 0 errors · `next lint` → clean · `next build` → 29 pages, succeeds

> ⚠️ **One new manual step:** run `scripts/search-fulltext.sql` in Supabase (P1-7).
> The site works without it — search falls back to the old path and logs a warning — but
> stays slow until it runs.

---

## The headline result

Every public page now renders statically. Before this work, the build reported `ƒ (Dynamic)`
for all 24 routes — no CDN caching, a Supabase round-trip on every single page view.

```
BEFORE                                  AFTER
ƒ /                                     ○ /                        (Static)
ƒ /about                                ○ /about                   (Static)
ƒ /contact                              ○ /contact                 (Static)
ƒ /products                             ○ /products                (Static)
ƒ /products/[category]                  ● /products/[category]      (SSG)
ƒ /products/[category]/[slug]           ● /products/[category]/[slug] (SSG)
```

Combined with narrowing the middleware to `/x-admin` only, a public page view now costs
**zero** Supabase queries and zero function invocations once cached.

---

## What changed, and how it was verified

### P1-1 · Static rendering restored
Root layout called `headers()`, which opted the whole app out of static rendering.

Restructured into route groups — `(public)` and `(admin)/x-admin/(dashboard)` — so chrome
selection is a routing concern rather than a runtime header check. Admin login, auth
callback and logout now sit outside the authenticated shell, which removed the second
`headers()` call too. Root layout is a pure shell. Added `revalidate = 3600` to catalog pages.

Middleware matcher narrowed from "almost everything" to `/x-admin/:path*` — this also
resolves **P2-5** (a Supabase `getUser()` call on every public request).

*Verified:* build output above.

### P1-2 · Header is now server-rendered
`Header`, `MobileNav` and `CommandPalette` were loaded with `ssr: false`, so the entire
navigation — and the mega-menu's internal linking — never reached crawlers.

*Verified* against the built HTML:
```
<header> present : 1
<nav> count      : 1
```
Previously zero of both. **This also unblocks the Next.js 16 upgrade** — `ssr: false` in a
Server Component is a hard error in Next 15+.

### P1-3 · Mass assignment closed
Admin `PATCH` handlers passed the raw body into `.update(body)` — any column was writable,
including `id`. Added `src/lib/validation.ts` with `.strict()` zod schemas across all admin
POST/PATCH routes.

*Verified* by exercising the schema directly:
```
REJECT  mass assignment: id
REJECT  unknown column
REJECT  empty patch
REJECT  bad slug (spaces)
REJECT  popularity out of range
ACCEPT  valid patch
```
Also fixed while in there: `parseInt` NaN guards on pagination, PostgREST `LIKE` wildcard
escaping, duplicate-slug now returns 409 instead of 500, and category deletion is refused
when products still reference it (previously orphaned them).

### P1-4 · Contact endpoint hardened
Validation was `if (!name || !email)`. Now: zod with length caps and real email validation,
rate limiting, and a honeypot.

*Verified:*
```
req 1-5: ALLOW    req 6-7: BLOCK (429)    different IP: ALLOW
REJECT  invalid email      REJECT  10MB description
```

`src/lib/rate-limit.ts` uses Upstash Redis when configured and an in-process counter
otherwise. **These are not equivalent** — the in-memory path is per-instance, so the
effective limit is (5 × instances). It stops casual abuse and double-submits, not a
determined spammer. Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (free tier is
ample) for a correct distributed limit.

Also: the route no longer reports success when both the database write **and** the email
failed — that previously showed a thank-you screen while silently losing the lead.

> **A bug I introduced and caught during verification:** my first version had the zod schema
> reject a filled honeypot, which returns a 400 listing the offending field — telling the bot
> exactly what gave it away and making the route's "reply 200 silently" branch unreachable.
> The schema now accepts it and the route handles it. Re-verified.

### P1-5 · Security headers
`next.config.mjs` now sets CSP, HSTS (2 years, preload-ready), `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; disables
`poweredByHeader`; marks `/x-admin` `no-store` + `noindex`; caches `/_next/static`
immutably; and adds Supabase Storage to `images.remotePatterns` (previously missing).

**A deliberate trade-off:** `script-src` uses `'unsafe-inline'` rather than a nonce. The
nonce approach requires generating a value per request in middleware, which forces every
page to render dynamically — undoing P1-1. For a marketing site with no user-generated
HTML, the static policy is the right call. Revisit if user content is ever rendered.

Also changed `removeConsole` to keep `error` and `warn` in production. Previously *all*
console output was stripped, which is why the broken contact form and 228 dead product
pages ran undetected.

### P1-6 · Open redirect fixed
`new URL("//evil.com", origin)` resolves to `https://evil.com` — a leading-slash check
alone is insufficient.

*Verified:*
```
//evil.com          -> /x-admin   same-origin OK
/\evil.com          -> /x-admin   same-origin OK
https://evil.com    -> /x-admin   same-origin OK
javascript:alert(1) -> /x-admin   same-origin OK
/x-admin/products   -> /x-admin/products  (legitimate path preserved)
```

### P1-7 · Search moved into Postgres
Every keystroke pulled up to 2,000 rows and scored them in Node, uncached.

`scripts/search-fulltext.sql` adds a generated `tsvector` (weighted A→D), a GIN index,
trigram indexes, and a `search_products` RPC that ranks in the database. Combines full-text
(handles stemming) with trigram similarity (handles typos), so both "ashwaganda" and
"ashwa" still match.

`searchProducts` calls the RPC and **falls back to the old path with a console warning if
the RPC is absent** — so the site keeps working before you run the migration. Search route
now sends `s-maxage=60, stale-while-revalidate=300`; the client no longer sends
`Cache-Control: no-cache`, which was defeating that caching entirely.

### P1-8 · Contact form dropdown fixed
It called `/api/catalog/products` with no `category` param — that route returns 400, the
catch swallowed it, and the list was always empty. Added
`/api/catalog/product-names` (returns a bare array, matching what the client expects) and
repointed the page. Errors now surface the server's actual message instead of a generic one.

### P1-9 · Hero images: 25 MB → 912 KB
```
Ancient Meets Modern    8.0 MB → 0.24 MB   (96.9% smaller)
Extraction Technology   8.2 MB → 0.24 MB   (97.0% smaller)
Herbal Extraction       8.5 MB → 0.21 MB   (97.5% smaller)
HPLCs.-factory          1.4 MB → 0.22 MB   (84.1% smaller)
```
Re-encoded to WebP at 2400 px. **Originals retained** as `.png` alongside. Also fixed
`priority` — it was set on all slides, so off-screen images competed for bandwidth with the
LCP element they were meant to help. Now slide 1 only; the rest lazy-load.

### P1-10 · Fonts: 6 families → 2
Only Space Grotesk (headings) and Inter (body) were ever applied. Plus Jakarta Sans, Open
Sans, Geist Sans and Geist Mono were loaded with `preload: true` on every page and used
nowhere — 19 font files competing during initial render. Removed from the layout, Tailwind
config, `globals.css` and the one inline `Header` style that referenced Open Sans.

> The local `src/app/fonts/GeistVF.woff` and `GeistMonoVF.woff` files (~200 KB) are now
> unreferenced and can be deleted whenever you like.

### P1-11 · CI pipeline
`.github/workflows/ci.yml` runs typecheck → lint → build on every push and PR — the gate
that would have caught the P0-2 error. A second advisory job runs `npm audit` without
blocking merges, since the postcss advisories can't be resolved before the Next 16 upgrade.

**Requires GitHub secrets:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`. The build genuinely queries Supabase now that
catalog pages prerender, so it will fail without them.

---

## An architectural consequence you should know about

Making pages static means **the build now queries Supabase**. If Supabase is paused or
unreachable during a deploy, the build fails.

**This is intentional, and it is the safer behaviour.** On Vercel a failed build leaves the
previous deployment live. The alternative — catching the error and shipping an empty
catalog — would *replace* a working site with a broken one. A failed deploy is a loud,
recoverable problem; a silently empty catalog is not.

`sitemap.ts` is the deliberate exception: it degrades to static pages, because a missing
sitemap is not worth failing a deploy over.

Given your Supabase project pauses on idle, keep the keepalive workflow running.

---

## Manual steps

### 1 · Run the search migration
Supabase Dashboard → SQL Editor → paste `scripts/search-fulltext.sql` → Run.

Verify with:
```sql
select id, name from public.search_products('ashwagandha', 10);
select id, name from public.search_products('ashwaganda', 10);  -- typo still matches
explain analyze select * from public.search_products('turmeric', 60);
```
The `explain` should show a Bitmap Index Scan on `idx_products_search_vector`, not a Seq Scan.

### 2 · Install the new dependencies
```bash
npm install
```
Adds `zod`, `@upstash/ratelimit`, `@upstash/redis` (already added to `package.json`).

### 3 · Optional — Upstash for distributed rate limiting
Create a free Redis database at upstash.com, then add to Vercel:
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

### 4 · Add the GitHub Actions secrets
Listed under P1-11 above.

### 5 · Optional — verified Resend sender
`from` still defaults to `onboarding@resend.dev`, a shared sandbox address that lands in
spam. Verify your domain in Resend and set `RESEND_FROM`, e.g.
`PuraVida Quotes <quotes@puravidanaturalindia.com>`.

---

## Post-deploy smoke test

- [ ] Homepage loads; hero images are visibly sharp but load fast
- [ ] View source on any page → `<header>` and `<nav>` are in the HTML
- [ ] Response headers include `Content-Security-Policy` and `Strict-Transport-Security`
- [ ] No CSP violations in the browser console (check the homepage and a product page)
- [ ] Contact page product dropdown is **populated**
- [ ] Submitting the contact form 6× in an hour returns a friendly 429 on the 6th
- [ ] Search returns results; try a deliberate typo
- [ ] `/x-admin/auth/callback?next=//evil.com` lands on `/x-admin`, not evil.com
- [ ] Admin panel still fully works — create, edit, delete a product
- [ ] Editing a product with an existing slug shows "already exists", not a 500

CSP is the most likely thing to need a tweak — if something breaks, the console will name
the exact directive.

---

## Still outstanding — P2 (13 findings)

The significant ones:

- **P2-1 · Next.js 14 is EOL** (26 Oct 2025), no security patches. Latest is 16.3.
  **P1-2 has removed the main blocker**, so this upgrade is now viable.
- **P2-2 · 9 npm vulnerabilities**, 6 high — all postcss, pinned by Next 14. Resolved by the upgrade.
- **P2-3 · 10 unused dependencies** — `three`, `@react-three/fiber`, `@react-three/drei`,
  `@types/three`, `@gsap/react`, `react-masonry-css`, 3 unused Radix packages, `geist`.
  Worth removing **before** the Next upgrade so you aren't debugging peer conflicts for code
  you don't use. (I already removed the dead `transpilePackages` and `.glsl` webpack rule.)
- **P2-7 · CRLF line endings** — `git diff` still reports every file as fully rewritten,
  which will make reviewing this work harder than it should be. One `.gitattributes` commit fixes it.
- **P2-8 · No observability** — now more valuable than its rating suggests, since production
  `console.error`/`warn` survive and the new code logs meaningfully.
- **P2-4 · Public reads still use the service-role key** — safe to switch to the anon key now
  that RLS is enabled. There's a `TODO` marking the spot in `src/lib/supabase.ts`.

Recommended order: **P2-3 → P2-7 → P2-1/P2-2 (the Next 16 upgrade) → P2-8**.
