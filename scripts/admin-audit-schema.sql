-- ════════════════════════════════════════════════════════════════
-- admin-audit-schema.sql: who did what in the admin panel, and when.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- One row per admin change (POST/PATCH/PUT/DELETE on /api/admin/*) and
-- per data export. Written server-side after the admin check passes;
-- service-role only, so nobody can read or erase it from a browser.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid,
  email       text,
  method      text NOT NULL,
  path        text NOT NULL,     -- includes the record id, e.g. /api/admin/leads/<id>
  action      text NOT NULL,     -- readable label, e.g. "lead.update"
  ip          text,
  user_agent  text
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service only" ON public.admin_audit_log;
CREATE POLICY "service only" ON public.admin_audit_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
