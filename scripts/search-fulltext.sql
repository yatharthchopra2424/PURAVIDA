-- ============================================================
-- P1-7 — Move product search into Postgres
--
-- BEFORE
--   searchProducts() pulled up to 2,000 full product rows out of
--   Postgres on every keystroke and scored them in Node. The search
--   route was `no-store`, so nothing was cached.
--
-- AFTER
--   A tsvector column with a GIN index, plus an RPC that ranks in the
--   database and returns only the rows needed. Combines full-text
--   search (word stemming) with trigram similarity (typos), so both
--   "ashwaganda" and "ashwa" still hit.
--
-- ------------------------------------------------------------
-- FIX NOTE (v2)
--   v1 failed with:
--     ERROR 42P17: generation expression is not immutable
--
--   Cause: array_to_string() is declared STABLE, not IMMUTABLE, and a
--   GENERATED ALWAYS column may only use IMMUTABLE expressions. Every
--   other part of the expression was fine — to_tsvector(regconfig,
--   text) and setweight() are both IMMUTABLE.
--
--   Fix: build the vector inside an explicitly IMMUTABLE wrapper
--   function. For text[] the result genuinely is deterministic, so the
--   declaration is honest; this is the standard documented workaround.
--
--   Also removed the `unaccent` extension — it was created but never
--   used, and unaccent() is STABLE so it could not be used here anyway.
-- ------------------------------------------------------------
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   Idempotent; safe to re-run.
--   Run scripts/enable-rls.sql FIRST if you have not already.
-- ============================================================

begin;

-- ── STEP 1 · Extensions ─────────────────────────────────────
create extension if not exists pg_trgm;


-- ── STEP 2 · Drop the old column first ──────────────────────
-- Must come before the function is (re)created: once a generated
-- column depends on a function, that function cannot be replaced.
-- Dropping the column also drops its index.
alter table public.products
  drop column if exists search_vector;


-- ── STEP 3 · IMMUTABLE vector builder ───────────────────────
-- Weights: A = name/slug, B = botanical + actives, C = description,
-- D = applications.
create or replace function public.products_search_vector(
  p_name         text,
  p_slug         text,
  p_botanical    text,
  p_ingredient   text,
  p_compound     text,
  p_description  text,
  p_applications text[]
)
returns tsvector
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select
    setweight(to_tsvector('english', coalesce(p_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_slug, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_botanical, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(p_ingredient, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(p_compound, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(p_description, '')), 'C') ||
    setweight(
      to_tsvector(
        'english',
        -- array_to_string() is STABLE, which is what broke v1. Calling
        -- it inside this IMMUTABLE wrapper is the supported workaround.
        coalesce(array_to_string(p_applications, ' '), '')
      ),
      'D'
    );
$$;


-- ── STEP 4 · Generated column + GIN index ───────────────────
alter table public.products
  add column search_vector tsvector
  generated always as (
    public.products_search_vector(
      name,
      slug,
      botanical_name,
      active_ingredient,
      active_compound,
      description,
      applications
    )
  ) stored;

create index if not exists idx_products_search_vector
  on public.products using gin (search_vector);


-- ── STEP 5 · Trigram indexes for fuzzy matching ─────────────
create index if not exists idx_products_name_trgm
  on public.products using gin (name gin_trgm_ops);

create index if not exists idx_products_botanical_trgm
  on public.products using gin (botanical_name gin_trgm_ops);

create index if not exists idx_products_ingredient_trgm
  on public.products using gin (active_ingredient gin_trgm_ops);


-- ── STEP 6 · Supporting indexes ─────────────────────────────
create index if not exists idx_products_popularity
  on public.products (popularity desc);

create index if not exists idx_products_category_popularity
  on public.products (category_id, popularity desc);

create unique index if not exists idx_products_slug
  on public.products (slug);


-- ── STEP 7 · Search RPC ─────────────────────────────────────
-- Mirrors the previous in-app weighting: exact name beats prefix match
-- beats fuzzy match, with popularity as the tiebreak.
drop function if exists public.search_products(text, integer);

create function public.search_products(
  search_query text,
  result_limit integer default 60
)
returns setof public.products
language sql
stable
security invoker           -- respects RLS; do not change to definer
set search_path = public, pg_temp
as $$
  with normalized as (
    select
      lower(btrim(search_query)) as q,
      websearch_to_tsquery('english', btrim(search_query)) as tsq
  )
  select p.*
  from public.products p, normalized n
  where
    n.q <> ''
    and (
      p.search_vector @@ n.tsq
      or p.name              ilike '%' || n.q || '%'
      or p.botanical_name    ilike '%' || n.q || '%'
      or p.active_ingredient ilike '%' || n.q || '%'
      or similarity(p.name, n.q) > 0.25
    )
  order by
    -- Tier 1: exact name match
    (lower(p.name) = n.q) desc,
    -- Tier 2: name starts with the query
    (lower(p.name) like n.q || '%') desc,
    -- Tier 3: full-text relevance, weighted by the A/B/C/D setweights
    ts_rank(p.search_vector, n.tsq) desc,
    -- Tier 4: trigram closeness (catches typos)
    similarity(p.name, n.q) desc,
    -- Tier 5: business preference
    p.popularity desc nulls last,
    p.name asc
  limit greatest(1, least(coalesce(result_limit, 60), 200));
$$;

-- The search route is public and unauthenticated.
grant execute on function public.search_products(text, integer)
  to anon, authenticated, service_role;

commit;


-- ── STEP 8 · Verify ─────────────────────────────────────────
-- 1. Column and index exist:
--      select column_name, is_generated
--      from information_schema.columns
--      where table_name = 'products' and column_name = 'search_vector';
--
-- 2. Ranked results:
--      select id, name, popularity from public.search_products('ashwagandha', 10);
--
-- 3. Typo tolerance:
--      select id, name from public.search_products('ashwaganda', 10);
--
-- 4. Index is actually used — look for a Bitmap Index Scan on
--    idx_products_search_vector rather than a Seq Scan:
--      explain analyze select * from public.search_products('turmeric', 60);
--
-- 5. All indexes present:
--      select indexname from pg_indexes
--      where tablename = 'products' and indexname like 'idx_products%';


-- ── STEP 9 · Rollback (if ever needed) ──────────────────────
-- Order matters: the column depends on the function.
--   drop function if exists public.search_products(text, integer);
--   alter table public.products drop column if exists search_vector;
--   drop function if exists public.products_search_vector(text,text,text,text,text,text,text[]);
