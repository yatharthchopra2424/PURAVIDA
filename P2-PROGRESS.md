# P2 Progress — SQL fix, dependency cleanup, line endings

**Date:** 15 August 2026
**Verification:** `tsc --noEmit` → 0 errors · `next lint` → clean · `next build` → 29 pages, green

---

## 1 · Fixed: `ERROR 42P17: generation expression is not immutable`

**Cause.** `array_to_string()` is declared `STABLE`, not `IMMUTABLE`, and a
`GENERATED ALWAYS` column may only contain `IMMUTABLE` expressions. Everything else in that
expression was fine — `to_tsvector(regconfig, text)` and `setweight()` are both immutable.
My original file called `array_to_string(applications, ' ')` inline to index the
applications array. That single call rejected the whole statement.

**Fix.** The vector is now built inside an explicitly `IMMUTABLE` wrapper function,
`public.products_search_vector(...)`, which the generated column calls. For `text[]` the
result genuinely is deterministic, so the declaration is honest — this is the standard
documented workaround. I also dropped the `unaccent` extension, which was created but never
used and is `STABLE` anyway, so it could never have been used there.

### Verified against real PostgreSQL 16.2

I stood up an actual Postgres instance rather than reasoning about it, and confirmed both
the failure and the fix:

```
==== 1. Reproduce the reported v1 failure ====
OK   v1: array_to_string inline  →  generation expression is not immutable

==== 2. Apply v2 ====
OK   run search-fulltext.sql v2
OK   seed products

==== 3. Generated column populated ====
   Ashwagandha Extract      vector=True
   Turmeric Oleoresin       vector=True
   Bergamot Oil             vector=True

==== 4. search_products() ====
   exact                      'ashwagandha'  -> ['Ashwagandha Extract']
   stemmed plural             'extracts'     -> ['Ashwagandha Extract']
   name                       'turmeric'     -> ['Turmeric Oleoresin']
   application (weight D)     'aromatherapy' -> ['Bergamot Oil']
   multi-word                 'bergamot oil' -> ['Bergamot Oil']
   no match                   'zzzznomatch'  -> (none)

==== 5. GIN index used ====
    idx_products_search_vector USED

==== 6. Column recomputes on write ====
   search 'saffron' -> ['Ashwagandha Extract']

==== 7. Idempotent re-run ====
OK   second run of the same file
```

**One gap I could not close locally:** the sandbox Postgres build ships without `pg_trgm`,
so the three trigram indexes and the `similarity()` typo-tolerance clause are **untested**.
Everything else ran. `pg_trgm` is standard on Supabase and `create extension if not exists
pg_trgm` is the correct call, so I expect it to work — but if the migration fails again,
that is the part to look at, and it will be a different error code.

**Re-run `scripts/search-fulltext.sql` now.** It drops and recreates cleanly, so the failed
first attempt left nothing behind.

---

## 2 · Removed 10 unused dependencies

Verified by grepping for actual import statements, not just package names:

| Removed | Why |
|---|---|
| `three` | Never imported. The entire Three.js stack was dead. |
| `@react-three/fiber` | Never imported |
| `@react-three/drei` | Never imported |
| `@types/three` | Types for a package that isn't used |
| `@gsap/react` | Never imported (plain `gsap` **is** used — kept) |
| `react-masonry-css` | Never imported |
| `@radix-ui/react-dialog` | Never imported |
| `@radix-ui/react-hover-card` | Never imported |
| `@radix-ui/react-navigation-menu` | Never imported |
| `geist` | Font package, removed with the font cleanup in P1-10 |

**Two I deliberately kept** despite appearing unused to a naive grep:

- **`resend`** — imported dynamically (`await import("resend")` in the contact route), so a
  static grep misses it. Removing it would have broken the contact form at runtime, not at
  build time.
- **`critters`** — never imported directly; it is a peer requirement of
  `experimental.optimizeCss`. Removing it breaks the build.

Also deleted the dead code these supported: `src/shaders/` (`.glsl`/`.vert`/`.frag` plus
the type declaration), `FluidBackground.tsx` (a 5-line stub returning `null`),
`FluidHero.tsx` (a misleading alias re-exporting `HeroCarousel` — the homepage now imports
`HeroCarousel` directly), `src/app/fonts/` (the two Geist `.woff` files, ~200 KB, orphaned
by P1-10), and `pnpm-lock.yaml` (the project uses npm; two lockfiles is a hazard).

**Result:** 555 → 452 packages installed. Build verified green afterwards.

---

## 3 · Fixed CRLF line endings

`git diff` previously reported **every file as entirely rewritten**, because the working
tree was CRLF while the committed blobs were LF. Review was effectively impossible.

Added `.gitattributes` (`* text=auto eol=lf`, explicit binary rules, `package-lock.json`
marked generated) and ran `git add --renormalize .`.

**Before:** 25 files "modified", including many nobody had touched.
**After:**

```
✓ postcss.config.mjs          — no diff (was: whole file)
✓ .gitignore                  — no diff (was: whole file)
✓ README.md                   — no diff (was: whole file)
✓ scripts/debug-search.sql    — no diff (was: whole file)
✓ scripts/supabase-seed.sql   — no diff (was: whole file)
✓ scripts/search-optimization.sql — no diff (was: whole file)
• src/app/globals.css         — 1/1  (the real font change)
```

Git now also detects the route-group restructure as **pure renames** rather than
delete-plus-add:

```
0  0  src/app/{x-admin => (admin)/x-admin/(dashboard)}/page.tsx
0  0  src/app/{x-admin => (admin)/x-admin/(dashboard)}/products/ProductsClient.tsx
```

Everything is staged but **not committed**, per your earlier preference. Total:
`87 files changed, 3737 insertions(+), 7745 deletions(-)`.

Commit it as one changeset — mixing renormalization with feature work in separate commits
is what creates confusing history.

---

## ⚠️ Something changed in `package.json` while I was working

Two packages were added externally:

```json
"framer": "^3.0.4",
"motion": "^13.1.0",
```

**Neither is imported anywhere in `src/`.** All 9 animation imports are from
`framer-motion`, which is already a dependency:

```
framer           0 imports
motion           0 imports
framer-motion    9 imports
```

I left them in place rather than reverting a change I didn't make. But worth knowing:

- `motion` is the **successor package** to `framer-motion` — same library, new name. Having
  both installed means two copies of the same animation engine resolvable in the bundle.
- `framer` is a different, largely legacy package.
- This directly undoes part of the cleanup above.

If they were added by accident, `npm uninstall framer motion` is safe — nothing imports
them. If you intend to migrate to `motion`, that is a reasonable move, but it should be a
deliberate swap: change the 9 import sites and drop `framer-motion`, rather than running
both side by side.

---

## Next: the Next.js 16 upgrade

The blockers are now clear:

- ✅ `ssr: false` in a Server Component removed (P1-2) — this was the hard blocker
- ✅ Unused deps stripped, so no peer-conflict debugging for code you don't use
- ✅ Line endings fixed, so the upgrade diff will be readable
- ✅ CI in place to catch regressions

Remaining work for the upgrade itself:

1. `npx @next/codemod@canary upgrade latest`
2. React 18 → 19 ships with it; check `framer-motion` and `cmdk` peer ranges
3. `experimental.optimizeCss` has moved — `critters` can likely be dropped then
4. Caching semantics changed in 15; audit each `revalidate` after upgrading
5. Resolves all 6 high-severity postcss advisories and returns you to a supported release

Worth doing on a branch with a preview deploy, given it touches every route.
