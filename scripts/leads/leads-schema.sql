-- ============================================================
-- PuraVida — Lead database + outbound email engine
-- Run once in Supabase SQL Editor: Dashboard → SQL Editor → New query
--
-- Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE.
--
-- Access model matches the existing `contacts` table: RLS is on and
-- denies everyone, and the admin panel reaches these tables only
-- through the service-role key from server-side code. The anon key
-- exposed in the browser bundle can therefore never read the lead
-- database or the campaign history.
-- ============================================================

-- ── Shared updated_at trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- leads — the master contact database
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Provenance ────────────────────────────────────────────
  -- `source` is the catalogue slug ("iphex-2025"); `source_ref` is
  -- "<source>#<record no>" and is what makes re-importing the same PDF
  -- an update instead of a duplicate.
  source             text NOT NULL,
  source_ref         text NOT NULL,
  source_page        integer,

  -- ── Extracted from the catalogue ──────────────────────────
  company_name       text NOT NULL,
  contact_name       text,
  salutation         text,
  designation        text,
  email              text,
  company_email      text,
  mobile             text,
  mobile_e164        text,
  phone              text,
  website            text,
  address            text,
  city               text,
  state              text,
  postal_code        text,
  country            text,
  hall_no            text,
  stall_no           text,
  company_profile    text,
  product_categories text[] NOT NULL DEFAULT '{}',
  product_category_raw text,
  parse_warnings     text[] NOT NULL DEFAULT '{}',

  -- ── AI enrichment (enrich-leads.ts) ───────────────────────
  ai_status          text NOT NULL DEFAULT 'pending'
                       CHECK (ai_status IN ('pending','done','failed','skipped')),
  ai_model           text,
  ai_error           text,
  ai_enriched_at     timestamptz,

  -- What the company actually is, in our words rather than theirs.
  segment            text,
  -- Free-form but controlled vocabulary; drives the bulk-select chips.
  tags               text[] NOT NULL DEFAULT '{}',
  -- 0-100 fit against the PuraVida ingredient catalogue.
  icp_score          integer CHECK (icp_score BETWEEN 0 AND 100),
  priority           text CHECK (priority IN ('A','B','C','D')),
  -- Are they a potential customer, a competitor, or neither?
  relationship       text CHECK (relationship IN ('buyer','supplier','both','not_relevant')),
  seniority          text CHECK (seniority IN ('owner','c_level','director','manager','staff','unknown')),

  -- Outreach assets, generated once and reused in campaigns.
  ai_summary         text,
  pitch_angle        text,
  icebreaker         text,
  suggested_products text[] NOT NULL DEFAULT '{}',
  -- Contradictions the AI found between fields (e.g. email domain does
  -- not match the company, designation looks unrelated to purchasing).
  data_flags         text[] NOT NULL DEFAULT '{}',
  -- Canonicalised location, since the PDF spells "India", "india",
  -- "India." and "ndia" for the same country.
  city_verified      text,
  state_verified     text,
  country_verified   text,
  ai_raw             jsonb,

  -- ── CRM state (owned by the admin panel) ──────────────────
  status             text NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','queued','contacted','replied','qualified','won','lost','do_not_contact')),
  notes              text,
  last_contacted_at  timestamptz,
  -- Set when a hard bounce or unsubscribe lands; campaigns skip these.
  is_suppressed      boolean NOT NULL DEFAULT false,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT leads_source_ref_unique UNIQUE (source, source_ref)
);

-- Filter and sort paths used by the admin table.
CREATE INDEX IF NOT EXISTS leads_source_idx        ON public.leads (source);
CREATE INDEX IF NOT EXISTS leads_status_idx        ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_ai_status_idx     ON public.leads (ai_status);
CREATE INDEX IF NOT EXISTS leads_priority_idx      ON public.leads (priority);
CREATE INDEX IF NOT EXISTS leads_segment_idx       ON public.leads (segment);
CREATE INDEX IF NOT EXISTS leads_icp_score_idx     ON public.leads (icp_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS leads_created_at_idx    ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx         ON public.leads (lower(email));
-- Tag chips filter with `tags && ARRAY[...]`, which needs GIN.
CREATE INDEX IF NOT EXISTS leads_tags_idx          ON public.leads USING gin (tags);
CREATE INDEX IF NOT EXISTS leads_categories_idx    ON public.leads USING gin (product_categories);
-- Free-text search across the three fields the admin actually types into.
CREATE INDEX IF NOT EXISTS leads_search_idx ON public.leads
  USING gin (to_tsvector('simple',
    coalesce(company_name,'') || ' ' || coalesce(contact_name,'') || ' ' || coalesce(email,'')));

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- email_templates — reusable drafts written in the admin composer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  subject     text NOT NULL,
  body_html   text NOT NULL,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS email_templates_set_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_set_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- email_campaigns — one row per bulk send
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  subject        text NOT NULL,
  body_html      text NOT NULL,

  from_name      text,
  from_email     text,
  reply_to       text,

  -- draft    → recipients queued, nothing sent yet
  -- sending  → the dispatcher is working through the queue
  -- paused   → admin stopped it; queued rows stay queued
  -- sent     → no queued rows left
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sending','paused','sent','failed')),

  -- Sends per dispatcher run. Keeps the send rate under whatever the
  -- SMTP provider allows and stops one campaign burning the domain's
  -- reputation in a single burst.
  batch_size     integer NOT NULL DEFAULT 25 CHECK (batch_size BETWEEN 1 AND 200),

  -- Denormalised counters. Kept in step by the dispatcher so the
  -- campaign list does not have to aggregate email_sends on every load.
  total_count    integer NOT NULL DEFAULT 0,
  sent_count     integer NOT NULL DEFAULT 0,
  failed_count   integer NOT NULL DEFAULT 0,
  opened_count   integer NOT NULL DEFAULT 0,
  clicked_count  integer NOT NULL DEFAULT 0,

  -- Files attached to every message in this campaign, as
  -- [{ name, path, size, type }] pointing into the storage bucket.
  attachments    jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Adds the open pixel and rewrites links through the click tracker.
  -- Off by default: both are things Gmail reads as bulk mail.
  track_opens    boolean NOT NULL DEFAULT false,

  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  started_at     timestamptz,
  completed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON public.email_campaigns (status);
CREATE INDEX IF NOT EXISTS email_campaigns_created_at_idx ON public.email_campaigns (created_at DESC);

DROP TRIGGER IF EXISTS email_campaigns_set_updated_at ON public.email_campaigns;
CREATE TRIGGER email_campaigns_set_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- email_sends — one row per recipient per campaign
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_sends (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  -- A lead can be deleted without destroying the send history.
  lead_id        uuid REFERENCES public.leads(id) ON DELETE SET NULL,

  to_email       text NOT NULL,
  to_name        text,
  subject        text NOT NULL,

  status         text NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','sending','sent','failed','skipped','bounced')),
  error          text,
  -- SMTP message id, for matching bounces back to the send.
  message_id     text,

  -- Opaque ids that appear in the tracking pixel and unsubscribe link.
  -- Separate from `id` so a leaked tracking URL reveals nothing that
  -- can be used against the API.
  tracking_id    uuid NOT NULL DEFAULT gen_random_uuid(),
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),

  queued_at      timestamptz NOT NULL DEFAULT now(),
  -- Set when a dispatcher claims the row. A claim older than the stall
  -- window means the worker died mid-send and the row can be requeued;
  -- queued_at cannot answer that, since it predates the send entirely.
  claimed_at     timestamptz,
  sent_at        timestamptz,
  first_opened_at timestamptz,
  open_count     integer NOT NULL DEFAULT 0,
  first_clicked_at timestamptz,
  click_count    integer NOT NULL DEFAULT 0,
  unsubscribed_at timestamptz,

  -- The same person must not receive one campaign twice, however the
  -- audience was selected.
  CONSTRAINT email_sends_campaign_email_unique UNIQUE (campaign_id, to_email)
);

CREATE INDEX IF NOT EXISTS email_sends_campaign_idx ON public.email_sends (campaign_id);
CREATE INDEX IF NOT EXISTS email_sends_lead_idx     ON public.email_sends (lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_sends_tracking_idx ON public.email_sends (tracking_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_sends_unsub_idx    ON public.email_sends (unsubscribe_token);
-- The dispatcher's hot path: "next N queued rows for this campaign".
CREATE INDEX IF NOT EXISTS email_sends_queue_idx ON public.email_sends (campaign_id, status, queued_at)
  WHERE status = 'queued';


-- ============================================================
-- email_events — raw open/click/unsubscribe log
-- ============================================================
-- email_sends carries the rolled-up counters; this is the audit trail
-- behind them, and the only place a click's destination URL is kept.
CREATE TABLE IF NOT EXISTS public.email_events (
  id          bigserial PRIMARY KEY,
  send_id     uuid NOT NULL REFERENCES public.email_sends(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('open','click','unsubscribe','bounce','complaint')),
  url         text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_send_idx     ON public.email_events (send_id);
CREATE INDEX IF NOT EXISTS email_events_campaign_idx ON public.email_events (campaign_id, type);


-- ============================================================
-- email_suppressions — the never-contact list
-- ============================================================
-- Checked before every send. An address lands here on unsubscribe or
-- hard bounce and stays; removing a row is a deliberate manual act.
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email      text PRIMARY KEY,
  reason     text NOT NULL CHECK (reason IN ('unsubscribe','bounce','complaint','manual')),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Migrations for databases created before a column existed
-- ============================================================
-- CREATE TABLE IF NOT EXISTS does nothing when the table is already
-- there, so a column added to the definition above never reaches an
-- existing install. These run either way and are safe to repeat.

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Open/click tracking, off by default. The 1x1 pixel and the rewritten
-- links are both Promotions-tab signals in Gmail, so tracking is opt-in
-- per campaign rather than always on.
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS track_opens boolean NOT NULL DEFAULT false;


-- ============================================================
-- Atomic counter bumps for the tracking endpoints
-- ============================================================
-- The pixel and click endpoints fire concurrently from many inboxes.
-- Read-modify-write from the application would lose opens under that
-- concurrency, so the increment happens inside the database.
--
-- Both count UNIQUE recipients, not raw events: the caller only invokes
-- these on the first open/click for a given send. "37 of 200 opened" is
-- the number worth reading; raw event totals live in email_events.

CREATE OR REPLACE FUNCTION public.increment_campaign_opens(campaign uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.email_campaigns
     SET opened_count = opened_count + 1
   WHERE id = campaign;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_clicks(campaign uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.email_campaigns
     SET clicked_count = clicked_count + 1
   WHERE id = campaign;
$$;

REVOKE ALL ON FUNCTION public.increment_campaign_opens(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_campaign_clicks(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_opens(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_clicks(uuid) TO service_role;


-- ============================================================
-- Row Level Security — deny all; service role bypasses
-- ============================================================
ALTER TABLE public.leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'leads','email_templates','email_campaigns',
    'email_sends','email_events','email_suppressions'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'No public access to ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (false)',
      'No public access to ' || t, t
    );
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
