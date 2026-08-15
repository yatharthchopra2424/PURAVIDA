-- ============================================================
-- P0-1 — Enable Row Level Security on all public tables
--
-- WHY THIS MATTERS
-- Supabase grants SELECT/INSERT/UPDATE/DELETE to the `anon` and
-- `authenticated` roles on public-schema tables by default. When RLS
-- is OFF, Postgres skips policy checks entirely, so those grants are
-- full grants. NEXT_PUBLIC_SUPABASE_ANON_KEY ships inside the browser
-- bundle — anyone can read it from DevTools and then DELETE the whole
-- catalog through the auto-generated REST API.
--
-- After this migration:
--   • anon + authenticated  → SELECT only on catalog tables
--   • anon + authenticated  → no access at all to contacts
--   • service_role          → unrestricted (bypasses RLS by design)
--
-- The admin panel keeps working because every /api/admin/* route uses
-- the service-role client (src/lib/supabase-service.ts).
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   Safe to run more than once (idempotent).
-- ============================================================

begin;

-- ── STEP 1 · Before state ───────────────────────────────────
-- Run this on its own first if you want to see what's exposed.
-- Any row with rowsecurity = false is currently world-writable.
--
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--   order by rowsecurity, tablename;


-- ── STEP 2 · products ───────────────────────────────────────
alter table public.products enable row level security;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- Deliberately no INSERT / UPDATE / DELETE policies.
-- Absent a permissive policy, RLS denies the operation.


-- ── STEP 3 · product_categories ─────────────────────────────
alter table public.product_categories enable row level security;

drop policy if exists "Categories are publicly readable" on public.product_categories;
create policy "Categories are publicly readable"
  on public.product_categories
  for select
  to anon, authenticated
  using (true);


-- ── STEP 4 · contacts (re-assert; already set in admin-schema.sql) ──
-- Inquiries contain customer names and emails. No public access at all;
-- the admin inbox reads them through the service-role client.
alter table public.contacts enable row level security;

drop policy if exists "No public access to contacts" on public.contacts;
create policy "No public access to contacts"
  on public.contacts
  for all
  to anon, authenticated
  using (false)
  with check (false);


-- ── STEP 5 · Tighten grants to match intent ─────────────────
-- Belt and braces: even if a policy is later dropped by accident,
-- the anon role simply has no write privilege to fall back on.
revoke insert, update, delete on public.products            from anon, authenticated;
revoke insert, update, delete on public.product_categories  from anon, authenticated;
revoke all                    on public.contacts            from anon, authenticated;

grant select on public.products           to anon, authenticated;
grant select on public.product_categories to anon, authenticated;
grant all    on public.contacts           to service_role;

commit;


-- ── STEP 6 · Verify ─────────────────────────────────────────
-- Every row must show rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by rowsecurity, tablename;

-- Confirm the expected policies exist.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ── STEP 7 · Optional hardening ─────────────────────────────
-- Auto-enable RLS on any table created in `public` from now on, so a
-- future table cannot silently ship unprotected. Straight from the
-- Supabase docs. Uncomment to install.
--
-- create or replace function rls_auto_enable()
-- returns event_trigger language plpgsql security definer
-- set search_path = pg_catalog as $$
-- declare cmd record;
-- begin
--   for cmd in
--     select * from pg_event_trigger_ddl_commands()
--     where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
--       and object_type in ('table', 'partitioned table')
--   loop
--     if cmd.schema_name = 'public' then
--       execute format('alter table if exists %s enable row level security', cmd.object_identity);
--       raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
--     end if;
--   end loop;
-- end; $$;
--
-- drop event trigger if exists ensure_rls;
-- create event trigger ensure_rls on ddl_command_end
--   when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
--   execute function rls_auto_enable();


-- ── STEP 8 · Post-run checklist (manual) ────────────────────
-- 1. Dashboard → Advisors → Security Advisor → clear every warning.
-- 2. Dashboard → Authentication → Providers → Email → DISABLE "Enable
--    signup" (P0-5). Otherwise anyone can self-register an account.
-- 3. Dashboard → Authentication → Users → delete any account you do
--    not recognise.
-- 4. Dashboard → Settings → API → roll the service_role key, then
--    update SUPABASE_SERVICE_ROLE_KEY in .env and in Vercel.
-- 5. Smoke test: the public site still lists products, and the admin
--    panel can still create/edit/delete them.
