# Lead engine — setup and operation

Turns a trade-show exhibitor catalogue PDF into a searchable, AI-scored
contact database in the admin panel, and sends tagged bulk outreach from
your own domain with open/click reporting.

Pipeline:

```
catalogue PDF  ──►  extract  ──►  import  ──►  enrich  ──►  /x-admin/leads
  (688 pages)       (JSON)      (Supabase)    (NVIDIA)          │
                                                                ▼
                                                    /x-admin/campaigns
                                                    compose → send → report
```

---

## 1. One-time setup

### 1.1 Create the tables

Supabase Dashboard → SQL Editor → New query → paste all of
`scripts/leads/leads-schema.sql` → Run.

It creates `leads`, `email_templates`, `email_campaigns`, `email_sends`,
`email_events`, `email_suppressions`, two counter functions, and RLS
policies that deny everyone. Only the service-role key reaches these
tables, and only from server-side code — the anon key in the browser
bundle cannot read your lead database.

Safe to re-run; every statement is `IF NOT EXISTS` / `OR REPLACE`, and
the file ends with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements
that bring an older database up to date.

**Re-run it whenever you pull changes.** `CREATE TABLE IF NOT EXISTS`
does nothing to a table that already exists, so a column added to the
definition never reaches an existing install on its own — the ALTERs at
the bottom are what carry it across.

### 1.1b Create the attachments bucket

Supabase Dashboard → Storage → **New bucket** → name it
`campaign-attachments` → leave **Public** switched **off**.

Campaign attachments are read back with the service-role key at send
time and embedded in the message, never linked. A public bucket would
make every price list world-readable to anyone who guessed the path.

Skip this only if you never attach files; the composer reports the
missing bucket clearly if you do.

### 1.2 Fill in `.env.local`

Copy the new block at the bottom of `.env.example` into `.env.local`.
The three groups:

| Variable | Needed for | Notes |
|---|---|---|
| `NVIDIA_API_KEY` | `leads:enrich` | From build.nvidia.com. Used by the CLI only, never at request time. |
| `SMTP_*`, `MAIL_*` | sending | The site-wide mail credentials — see `EMAIL-SETUP.md`. Campaigns use the same mailbox as the contact form. |
| `CRON_SECRET` | unattended sending | `openssl rand -hex 32`. Same value in Vercel and in the GitHub repo secret. |
| `CAMPAIGN_LINK_HOSTS` | optional | Extra hosts campaign links may point at. |

Set the same values in **Vercel → Settings → Environment Variables**, or
nothing sends in production.

### 1.3 Email and domain authentication — before the first real send

Mail goes over your own SMTP mailbox; there is no third-party sending
API anywhere in this project. Full setup, provider settings and the
SPF/DKIM/DMARC records are in **`EMAIL-SETUP.md`** — work through it
before sending outreach, because cold email from a domain without those
records lands in spam and a bad first send is hard to recover from.

Quick check:

```bash
npm run mail:verify -- --to rk@puravidanaturalindia.com
```

### 1.4 Schedule the dispatcher

`.github/workflows/dispatch-campaigns.yml` runs every 5 minutes and
sends one batch per active campaign, so a campaign finishes after you
close the browser tab.

GitHub → Settings → Secrets and variables → Actions → New repository
secret → `CRON_SECRET`, matching the value in Vercel.

(Vercel Cron works too if you are on a plan that includes it — point it
at `/api/cron/dispatch-campaigns`.)

---

## 2. Loading a catalogue

Put the PDF in `docs/catalogues/` — **not** `public/`. Anything in
`public/` is served at a public URL, and this file carries 642 named
people's direct emails and mobile numbers.

```bash
npm run leads:extract      # PDF  → scripts/leads/out/iphex-2025.json
npm run leads:import       # JSON → Supabase `leads`
npm run leads:enrich       # AI scoring + cross-verification
```

For next year's catalogue:

```bash
npm run leads:extract -- --pdf docs/catalogues/iphex-2026.pdf --source iphex-2026
npm run leads:import  -- --file scripts/leads/out/iphex-2026.json
npm run leads:enrich
```

Useful flags:

```bash
npm run leads:import -- --dry-run          # parse and report, write nothing
npm run leads:enrich -- --limit 20         # try a small batch first
npm run leads:enrich -- --concurrency 6    # faster, if the rate limit allows
npm run leads:enrich -- --redo failed      # retry only the failures
npm run leads:check                        # prove the email renderer still works
```

Re-running `leads:import` on the same catalogue **updates** rows rather
than duplicating them, and leaves AI enrichment and CRM state (status,
notes, suppression) alone.

### What the extractor does

The IPHEX layout puts `Hall No` a few points *above* the company name in
a right-hand column, so a naive top-to-bottom read makes the company
name look like part of the hall number. The parser splits each page by
X into a main and a side column, treats every field as single-line
except the two that genuinely wrap, and folds overflow pages (a
molecule list running past the page bottom) back into the record they
belong to. It also repairs the fi/fl ligatures the PDF stores as
unmapped Private Use glyphs — without that, every "profile" reads
"prole" and "certified" reads "certied".

Result on the 2025 catalogue: 688 pages → 642 exhibitors, 639 unique
email addresses, zero records missing an address. Every page is
accounted for (31 cover/index + 15 overflow + 642 records).

### What the enrichment adds

Per lead, from NVIDIA Nemotron, grounded in your live product catalogue
read from the database:

- **Fit score 0–100 and priority A–D** against what PuraVida actually
  sells, so 642 rows arrive ranked instead of alphabetical.
- **Segment and tags** from a fixed vocabulary — the same list the admin
  filters on, so a label the model invents can never become unreachable.
- **Outreach brief** — what they do, why to contact them, and a one-line
  icebreaker referencing that company's own profile text.
- **Cross-verification flags** — email domain that does not match the
  company, a contact who will not influence a purchase, a name that
  looks like a parsing artefact, and a canonical city/state/country
  (the PDF spells the same country "India", "india", "India." and
  "ndia").

---

## 3. Sending a campaign

1. **/x-admin/leads** — filter by tag (Pharma, Nutraceutical, Herbal /
   Ayurvedic …), priority, segment, score. Tick rows, or tick the header
   box and choose "Select all N matching".
2. **Email** → the composer opens with the audience already resolved,
   and tells you who was excluded and why (no address, duplicate
   address, unsubscribed).
3. Write the subject and body. Merge fields insert at the cursor:
   `{{first_name}}`, `{{company}}`, `{{icebreaker}}`, `{{products}}` …
   Unknown `{{tokens}}` are reported before you send, not after.
4. **Preview** renders against a real lead from your selection.
   **Send test** delivers that exact message to your own inbox.
5. **Start sending** — asks for confirmation with the recipient count,
   then works through the queue in batches. The report page shows
   delivered / opened / clicked / failed and the per-recipient list, and
   you can pause at any point.

Selecting by filter rather than by ticking re-runs the query *at send
time*, so someone who unsubscribed between choosing and sending is not
contacted.

### Sending rate

`batch_size` (default 25) is how many go out per dispatcher run. With
the 5-minute GitHub schedule that is roughly 300/hour. Check your mail
provider's limit before raising it — Google Workspace allows 2,000
recipients/day, Zoho 1,000 on most plans, and shared cPanel hosts are
often far lower. Exceeding it gets the mailbox suspended.

For a first campaign, send to 20–30 leads and watch what happens before
queueing hundreds.

---

## 4. Compliance

Every message carries a working one-click unsubscribe (RFC 8058
headers, so Gmail and Outlook show their own unsubscribe button) and
your postal address. An unsubscribe is recorded against the *address*,
not the lead, so it holds across every future campaign and every other
catalogue row carrying that address — and any queued send to them is
cancelled immediately.

Opt-outs are one-way by design: removing a row from `email_suppressions`
is a deliberate manual act in the SQL editor.

Cold B2B email to a published trade-show contact is lawful in India and
in most jurisdictions PuraVida exports to, **provided** the recipient
can opt out and you identify yourself. Both are built in. GDPR applies
to any EU contacts in the list — legitimate interest covers B2B
outreach, but honour opt-outs immediately and do not mail anyone twice
who ignored you.

---

## 5. Where things live

| Path | What |
|---|---|
| `scripts/leads/extract-catalog.ts` | PDF → JSON |
| `scripts/leads/import-leads.ts` | JSON → Supabase |
| `scripts/leads/enrich-leads.ts` | AI scoring + verification |
| `scripts/leads/leads-schema.sql` | All six tables, RLS, counter functions |
| `src/lib/leads.ts` | Shared vocabulary + the one filter builder |
| `src/lib/mailer.ts` | SMTP transport |
| `src/lib/campaign-render.ts` | Merge, escaping, tracking, unsubscribe footer |
| `src/lib/campaigns.ts` | Audience resolution + the send worker |
| `src/app/(admin)/x-admin/(dashboard)/leads/` | Lead table + drawer |
| `src/app/(admin)/x-admin/(dashboard)/campaigns/` | Composer + report |
| `src/app/api/t/`, `src/app/api/unsubscribe/` | Open, click, opt-out |
| `src/app/api/cron/dispatch-campaigns/` | The unattended worker |

---

## 6. Troubleshooting

**"Lead database not ready" on /x-admin/leads** — the SQL has not been
run, or `SUPABASE_SERVICE_ROLE_KEY` is wrong.

**Enrichment fails on every row** — check `NVIDIA_API_KEY`. Retry with
`npm run leads:enrich -- --redo failed`; progress is stored per row, so
nothing already done is paid for twice.

**Campaign stuck at "sending" with nothing going out** — SMTP is not
configured in the deployed environment (it is separate from your local
`.env.local`), or `CRON_SECRET` is missing so the dispatcher refuses to
run. Open the campaign page: it dispatches from the browser and will
show the real error.

**Opens showing far lower than replies** — expected. The pixel is
blocked by most corporate mail filters and by Apple Mail Privacy
Protection. Clicks are the signal worth trusting.

**A send row stuck in `sending`** — a worker died mid-batch. The next
dispatcher run requeues anything claimed more than 15 minutes ago.
