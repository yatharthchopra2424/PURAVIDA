# P0 Remediation — Completed

**Date:** 15 August 2026 · **Scope:** all 7 P0 findings from `PRODUCTION-AUDIT.md`

**Verification:** `tsc --noEmit` → 0 errors · `next lint` → clean · `next build` → succeeds

> ⚠️ **Code changes alone are not enough.** Four of these fixes require action in the
> Supabase and Vercel dashboards before they take effect in production.
> See **[Manual steps](#manual-steps--do-these-before-deploying)** below.

---

## What changed in code

### P0-2 · Build-blocking lint error — FIXED
`src/app/api/keepalive/route.ts` — removed the unused `data` binding. `next build` now completes.

### P0-6 · Plaintext credentials — REMOVED
- `.env` — deleted the admin username/password block; added documentation and the new
  `NEXT_PUBLIC_SITE_URL` / `ADMIN_EMAILS` variables.
- `.env.example` — **new**, committed, documents every variable with no real values.
- Consolidated the duplicated `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` pair
  (identical values) down to `SUPABASE_SERVICE_ROLE_KEY`. Updated `src/lib/supabase.ts`
  and `scripts/upload-product-images.ts` accordingly.

### P0-1 · Row Level Security — MIGRATION READY
`scripts/enable-rls.sql` — **new**. Enables RLS on `products`, `product_categories` and
re-asserts it on `contacts`; adds public-read policies; revokes write grants from `anon`
and `authenticated`; includes before/after verification queries.
**You must run this in the Supabase SQL editor.**

### P0-5 · Admin allowlist — ENFORCED
- `src/lib/admin-allowlist.ts` — **new**. Pure helpers, no `next/headers` import, so it is
  safe to use from Edge middleware. **Fails closed:** an empty `ADMIN_EMAILS` denies everyone.
- `src/lib/admin-auth.ts` — now returns **403** for a signed-in non-admin (was: allowed).
- `src/middleware.ts` — checks the allowlist, not merely session presence.
- `src/app/x-admin/layout.tsx` — defence-in-depth check, in case middleware is bypassed.
- `src/app/x-admin/login/page.tsx` — shows a clear "not authorized" notice; also fixes the
  open redirect on the `redirect` param (`//evil.com` is now rejected).

All four redirect paths were traced to confirm no loop:

| Session | Requests | Result |
|---|---|---|
| None | `/x-admin` | → login (`?redirect=`) · form renders |
| Non-admin | `/x-admin` | → login (`?error=not_authorized`) · banner, no loop |
| Non-admin | `/x-admin/login` | form + banner, no bounce |
| Admin | `/x-admin/login` | → `/x-admin` dashboard |

### P0-4 · Wrong domain in sitemap/robots — FIXED
- `src/lib/site.ts` — **new**. Single source of truth for the origin; reads
  `NEXT_PUBLIC_SITE_URL`, falls back to the Vercel preview URL, then production.
- `src/app/sitemap.ts` / `src/app/robots.ts` — now use it. Every URL will emit
  `www.puravidanaturalindia.com` instead of the wrong `puravidanatural.com`.
- `robots.ts` also now disallows `/x-admin` and `/api/`.
- `src/app/layout.tsx` — added `metadataBase` so canonical and OG URLs resolve.

### P0-7 · No error handling — ADDED
- `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` — **all new**.
- `src/app/sitemap.ts` — catalog fetch wrapped in try/catch; degrades to static pages
  instead of failing the deploy. **Verified:** the build now succeeds even with Supabase
  unreachable, which previously killed it outright.
- `.github/workflows/keepalive.yml` — `curl` now uses `--fail --retry 3 --max-time 30`,
  so a failing keepalive reports red instead of a false green.

### P0-3 · 89% of product pages broken — FIXED
The largest change. Category and product pages read from a hardcoded 28-item array while
the homepage and sitemap read from Supabase (~250 products).

- `src/app/products/page.tsx` — Supabase-backed; **all 7 categories** now appear
  (`fruit-juice-powders`, `phytochemicals`, `amino-acids` were previously invisible).
- `src/app/products/[category]/page.tsx` — Server Component using the pre-existing but
  never-imported `CategoryClient`. Adds `generateStaticParams`, `generateMetadata`, and a
  real `notFound()`.
- `src/app/products/[category]/[slug]/page.tsx` — same treatment via `ProductDetailClient`.
  Adds per-product titles/descriptions/canonicals, `Product` JSON-LD structured data, and a
  canonical redirect when a product is reached under the wrong category.
- `src/lib/catalog.ts` — added `fetchCategoryBySlug`; made `fetchProductsByCategory`
  resolve the category properly instead of assuming `category_id === slug`.
- **Deleted** `src/data/products.ts`, `src/data/categories.ts` — so the two sources can
  never drift apart again. (`src/data/navigation.ts` is legitimately static and stays.)
- **Deleted** `scripts/generate-supabase-seed.ts` — a one-time bootstrap that read those
  arrays. Its output, `scripts/supabase-seed.sql`, is retained.

**Build output confirms the fix.** Both catalog routes changed from `ƒ (Dynamic)` to
`● (SSG)`:

```
before                                     after
ƒ /products/[category]                     ● /products/[category]
ƒ /products/[category]/[slug]              ● /products/[category]/[slug]
```

---

## Manual steps — do these before deploying

### 1 · Run the RLS migration (P0-1) — **most urgent**
Supabase Dashboard → SQL Editor → paste `scripts/enable-rls.sql` → Run.

Confirm every row returns `true`:
```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```
Then clear **Advisors → Security Advisor**.

### 2 · Disable public signup (P0-5)
Dashboard → Authentication → Providers → Email → turn **off "Enable signup"**.
Then review Authentication → Users and delete any account you don't recognise.

The code allowlist already blocks non-admins, but leaving signup open lets strangers
create accounts against your project.

### 3 · Rotate credentials (P0-6)
Both were sitting in plaintext on disk. Treat them as compromised.

- **Admin password** — Dashboard → Authentication → Users → `ps@puravidanaturalindia.com`
  → reset. Store the new one in a password manager, **not** in `.env`.
- **Service-role key** — Dashboard → Settings → API → roll `service_role`.
  Update `SUPABASE_SERVICE_ROLE_KEY` in `.env` *and* in Vercel.

### 4 · Set Vercel environment variables
Vercel → Project → Settings → Environment Variables:

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.puravidanaturalindia.com` |
| `ADMIN_EMAILS` | `ps@puravidanaturalindia.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(the newly rotated key)* |
| `CONTACT_EMAIL` | `ps@puravidanaturalindia.com` |

`ADMIN_EMAILS` fails closed — if it is unset in Vercel, **nobody** can reach the admin
panel in production. That is intentional, but it does mean you must set it.

### 5 · Resubmit the sitemap
After deploying, Google Search Console → Sitemaps → submit
`https://www.puravidanaturalindia.com/sitemap.xml`.

The old sitemap advertised a different domain entirely, so this is effectively a first
submission. Expect indexing to take days to weeks.

---

## Post-deploy smoke test

- [ ] `/` loads; homepage carousel renders
- [ ] `/products` shows **7** categories (was 4)
- [ ] `/products/essential-oils` lists the full range (was 5)
- [ ] `/products/essential-oils/bergamot-oil` renders a real product — **this was the
      "Product not found" page**
- [ ] A genuinely invalid slug returns a real **404**, not a 200
- [ ] `/sitemap.xml` shows `www.puravidanaturalindia.com` throughout
- [ ] `/robots.txt` disallows `/x-admin`
- [ ] Admin login works with `ps@puravidanaturalindia.com`
- [ ] A non-allowlisted account is rejected with the "not authorized" banner
- [ ] Admin can still create / edit / delete a product **after** the RLS migration
- [ ] Contact form still submits

---

## One correction to the audit report

**P2-13 was wrong.** I flagged `fetchProductsByCategory` for comparing a slug against
`category_id`. Checking the seed files showed `product_categories.id` *is* the slug, so the
original query was correct. The code has been made robust anyway (it now resolves the
category first), but the finding as written was inaccurate.

---

## Still outstanding

P0 is complete. Not yet addressed, in the order recommended in `PRODUCTION-AUDIT.md`:

- **P1** (11 findings) — every page still renders dynamically (`headers()` in the root
  layout, P1-1); the header is still `ssr: false` and invisible to crawlers (P1-2);
  mass assignment on admin PATCH (P1-3); no rate limiting on the contact endpoint (P1-4);
  no security headers (P1-5); contact form's product dropdown still empty (P1-8);
  8 MB hero images (P1-9); no CI (P1-11).
- **P2** (13 findings) — Next.js 14 is EOL and unpatched; 10 unused dependencies including
  all of Three.js; CRLF line endings making diffs unreadable; no observability.

Two notes worth carrying forward: P1-1 and P1-2 unlock most of the remaining performance
and SEO gain and should be done together, and **P1-2 is a hard blocker for the Next.js 16
upgrade** — `ssr: false` in a Server Component throws in Next 15+.
