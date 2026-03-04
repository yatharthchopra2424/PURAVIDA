-- ============================================================
-- PuraVida Admin Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor
-- ============================================================

-- ── contacts table (for the inquiry inbox) ──────────────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  email        text NOT NULL,
  product      text,
  quantity     text,
  description  text,
  cart_items   jsonb,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast unread queries
CREATE INDEX IF NOT EXISTS contacts_is_read_idx ON public.contacts (is_read);
CREATE INDEX IF NOT EXISTS contacts_created_at_idx ON public.contacts (created_at DESC);

-- RLS: only service role can access (admin bypasses via service key)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Deny all access from anon/authenticated (service role bypasses RLS)
CREATE POLICY "No public access to contacts"
  ON public.contacts FOR ALL
  USING (false);

-- ── Grant to service role (already implicit, but explicit is safer) ──
GRANT ALL ON public.contacts TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
