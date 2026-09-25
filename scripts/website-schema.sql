-- ════════════════════════════════════════════════════════════════
-- website-schema.sql: website quote requests and first-party traffic
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
--   website_leads : every quote/contact form submission, with the
--                   catalogue-matched items, status and attribution
--   site_events   : anonymous page views and funnel events for the
--                   admin Traffic page (no cookies, no personal data)
--
-- Both are service-role only: the public anon key can neither read
-- nor write them. The site writes through its own API routes.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.website_leads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  name           text NOT NULL,
  company        text,
  email          text NOT NULL,
  phone          text,
  country        text,
  market         text NOT NULL DEFAULT 'unknown'
                   CHECK (market IN ('domestic','export','unknown')),
  buyer_type     text,
  -- [{ product_id, name, slug, category, quantity, unit, grade, matched }]
  items          jsonb NOT NULL DEFAULT '[]',
  message        text,
  wants_samples  boolean NOT NULL DEFAULT false,

  status         text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','contacted','quoted','won','lost','spam')),
  quote_notes    text,
  quoted_at      timestamptz,

  -- attribution
  source_page    text,
  referrer       text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  ip_country     text,

  -- delivery bookkeeping
  lead_id              uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  confirmation_sent    boolean NOT NULL DEFAULT false,
  notification_sent    boolean NOT NULL DEFAULT false,
  email_error          text
);

CREATE INDEX IF NOT EXISTS website_leads_created_idx ON public.website_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS website_leads_status_idx  ON public.website_leads (status);
CREATE INDEX IF NOT EXISTS website_leads_email_idx   ON public.website_leads (lower(email));

ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service only" ON public.website_leads;
CREATE POLICY "service only" ON public.website_leads FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.website_leads FROM anon, authenticated;
GRANT ALL ON public.website_leads TO service_role;

-- ── Traffic ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- 'pageview' | 'add_to_quote' | 'quote_open' | 'form_start' | 'form_submit' | 'amazon_click' | 'whatsapp_click'
  event       text NOT NULL,
  path        text NOT NULL,
  -- random per-tab id held in sessionStorage; not a cookie, not a person
  session_id  text,
  referrer_host text,
  source      text,      -- classified: google, bing, chatgpt, perplexity, gemini, linkedin, amazon, email, direct, other
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  country     text,      -- from Vercel's geo header
  device      text,      -- mobile | tablet | desktop
  product_slug text,
  meta        jsonb
);

CREATE INDEX IF NOT EXISTS site_events_created_idx ON public.site_events (created_at DESC);
CREATE INDEX IF NOT EXISTS site_events_event_idx   ON public.site_events (event, created_at DESC);

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service only" ON public.site_events;
CREATE POLICY "service only" ON public.site_events FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.site_events FROM anon, authenticated;
GRANT ALL ON public.site_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.site_events_id_seq TO service_role;
