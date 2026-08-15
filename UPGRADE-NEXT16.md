# Next.js 16 + React 19 Upgrade — Completed

**Date:** 15 August 2026
**Next.js** 14.2.35 → **16.3.1** · **React** 18.3.1 → **19.2.8** · **ESLint** 8 → 9

**Verification:** `tsc --noEmit` → 0 errors · `eslint .` → 0 problems · `next build` → green, **0 warnings** · `npm audit` → **0 vulnerabilities** (was 9, 6 high)

The upgrade was done in a throwaway sandbox copy first and only ported to the repo once
everything above was green, plus a runtime pass against a running server.

---

## The one that would have silently broken production

**`middleware.ts` no longer runs in Next 16.** It has been renamed to `proxy.ts`, with the
exported function renamed `middleware` → `proxy`.

The dangerous part: the old file **still compiles and still typechecks**. It just never
executes. There is no error, no warning, nothing in the build output.

For this app that would have meant the entire admin auth guard silently disappearing —
`/x-admin` would have been reachable by anyone. Migrated via the official codemod and
verified against a running server:

```
/x-admin unauth   307 -> /x-admin/login?redirect=%2Fx-admin
```

The build output now lists `ƒ Proxy (Middleware)`, which is the confirmation it is
registered. `proxy.ts` also runs on the Node.js runtime rather than Edge — this change was
motivated in part by CVE-2025-29927, the middleware auth bypass that affected the 14.x line.

---

## Everything else that changed

### `next lint` was removed
Replaced with the ESLint CLI. Added `eslint.config.mjs` (flat config), deleted
`.eslintrc.json`, and updated the scripts:

```json
"lint":      "eslint .",
"lint:fix":  "eslint . --fix",
"typecheck": "tsc --noEmit"
```

**Two snags worth recording.** `eslint-config-next@16` requires ESLint ≥ 9, but **ESLint 10
breaks it** — the bundled `eslint-plugin-react` calls a removed API and every lint run dies
with `contextOrFilename.getFilename is not a function`. Pinned to `eslint@^9`. Also,
`FlatCompat` fails against this config; v16 ships native flat-config exports, so they are
imported directly instead.

### Turbopack is now the default builder
Custom webpack configs cause build failures unless you pass `--webpack`. This app had no
webpack config left — the `.glsl` rule was removed during the P2-3 dependency cleanup — so
nothing was needed. Removing those unused deps *before* the upgrade paid off here.

### Three real code issues surfaced by React 19 lint rules
Not lint noise — all three were genuine anti-patterns, fixed properly rather than suppressed:

- **`HeroCarousel`** called `setProgress(0)` synchronously inside an effect, triggering a
  cascading render every slide. Removed; the first `requestAnimationFrame` frame sets it
  anyway, so behaviour is identical with one fewer render pass.
- **`ProductModal` / `CategoryModal`** derived `slug` from `name` inside an effect. Moved
  into the change handler, so both fields update in a single state write.
- **`settings/page.tsx`** used `window.location.href` for internal navigation. Now
  `router.replace()` + `router.refresh()`, which stays inside the Next router and clears
  cached Server Component data for the signed-out session.

### `/_next/static` cache header removed
Next 16 warns that overriding it "can break Next.js development behavior", and Next already
serves that path immutably. The build is now warning-free.

---

## The 404 problem — and the decision you made

`searchParams` in the category page forced that route to render dynamically under Next 16,
losing its static generation. Fixed by reading `highlight` client-side via
`useSearchParams()` behind a `Suspense` boundary. Both catalog routes are back to `●` SSG.

While verifying that, I found something the original audit had **not** caught: unknown
product URLs returned **HTTP 200** with a "not found" page — a soft 404. I tested this
carefully rather than assuming:

| Configuration | Unknown slug | New product appears |
|---|---|---|
| Default (`dynamicParams` true) | **200** on 1st and 2nd hit | instantly |
| No `revalidate` | **200** | instantly |
| `dynamicParams = false` | **404** ✓ | needs a rebuild |

Only `dynamicParams = false` produces a real 404. You chose true 404s **plus an automatic
deploy hook**, which gets both:

- `dynamicParams = false` on both catalog routes → verified 404s
- `src/lib/deploy-hook.ts` → the admin routes POST to a Vercel Deploy Hook after any
  create / update / delete, on all 6 mutation paths. Debounced to one rebuild per minute so
  a burst of edits doesn't queue a burst of builds, and it never fails the admin action if
  the hook is unreachable — the content change already succeeded.

Net effect: correct 404s for SEO, and a product added in the admin panel is live in about a
minute without anyone touching Vercel.

---

## Final runtime verification

```
── SEO / 404 correctness ──
  unknown product         404   (want 404)
  unknown category        404   (want 404)
  known product           200   (want 200)
  per-product title       <title>Bergamot Oil | PuraVida Natural</title>
  Product JSON-LD         present
  canonical               https://www.puravidanaturalindia.com/products/...
── Security ──
  security headers        4/4 present
  /x-admin unauth         307 -> /x-admin/login?redirect=%2Fx-admin
  open-redirect blocked   //evil.com -> /x-admin
  x-powered-by hidden     0
── Rendering ──
  header in server HTML   1
  nav in server HTML      1
  skip link               present
  sitemap domain          https://www.puravidanaturalindia.com
  robots disallows admin  yes
```

Every P0 and P1 fix survived the upgrade intact.

---

## ⚠️ I removed two packages to unblock this

`framer@3.0.4` **hard-pins `react@^18.2.0`** and blocked React 19 outright:

```
npm error Could not resolve dependency:
npm error peer react@"^18.2.0" from framer@3.0.4
```

Neither `framer` nor `motion` was imported anywhere — all 9 animation imports are
`framer-motion`, which stays. I removed both rather than force-resolving a broken tree,
since leaving an unused package blocking a security-critical upgrade seemed the worse call.
Flagging it because I know they were added deliberately.

If you do want to move to `motion` (the successor to `framer-motion`), that is a reasonable
migration — but it should be a deliberate swap of the 9 import sites with `framer-motion`
removed, not both installed side by side.

---

## Before you deploy

1. **`npm install`** — the lockfile is updated but your `node_modules` still has the old tree.
2. **Vercel → Settings → General → Node.js Version → 22.x.** Next 16 requires ≥ 20.9; the
   build will fail on 18.
3. **Create the deploy hook.** Vercel → Settings → Git → Deploy Hooks → Create Hook, target
   your production branch, then set `VERCEL_DEPLOY_HOOK_URL` in the environment variables.
   Without it everything still works — you just redeploy manually after adding products.
4. **Run `scripts/search-fulltext.sql`** if you haven't since the fix.
5. **GitHub Actions secrets** for CI: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`.
6. **Deploy to a preview first.** This touches every route.

### Smoke test on the preview

- [ ] Homepage, about, contact, products all load
- [ ] A product page loads; an invented slug gives a real 404 (not a styled 200)
- [ ] Admin login works; `/x-admin` redirects when signed out — **check this first**, it is
      what the proxy rename affects
- [ ] Create a test product → a new deployment starts in Vercel within a minute
- [ ] Hero carousel animates; slide transitions are smooth
- [ ] Search returns results
- [ ] No CSP violations in the browser console

---

## What's left

- **Tailwind 3 → 4** — deliberately excluded so any visual regression is attributable to one
  change. Config moves from `tailwind.config.ts` into CSS `@theme`.
- **P2-8 · Observability** — now the most valuable remaining item. Production `console.error`
  and `warn` survive (changed in P1-5), so Sentry would have somewhere to hook in.
- **P2-4** — public reads still use the service-role key; safe to switch to the anon key now
  that RLS is enabled. There's a `TODO` marking the spot in `src/lib/supabase.ts`.
- **P2-9** — placeholder GST/IEC numbers still render on the live site.
- **P2-12** — accessibility pass (the skip link and landmarks landed with P1-1; icon-button
  labels and `prefers-reduced-motion` remain).
