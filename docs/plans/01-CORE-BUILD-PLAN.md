# Plan 1: Core build (security, quotes, website leads, traffic, Amazon)

Date: 25 Sep 2026 · **Status: code complete.** Security ✅ · Phase 1 ✅ · 2FA ✅ · activity log ✅ · Phase 2 ✅ · Phase 4 ✅ · home trust sections ✅ · schema SQL ✅ run · repo private ✅

**Not live until you:** (1) deploy, which also removes the Aadhaar PDF that is still downloadable on the live site; (2) run `scripts/admin-audit-schema.sql`; (3) add `SMTP_PK_*` to Vercel. Google Search Console data is read from the CSV exports in `private-docs/analytics/`; a live API connection needs a service-account key (optional).

---

## Analytics review (Vercel, 26 Aug to 25 Sep 2026) and what changed

| Finding | Data | Action taken |
|---|---|---|
| Admin pages polluted the numbers | 218 of 373 page views (58%) were `/x-admin` | ✅ Vercel Analytics now drops `/x-admin` (`SiteAnalytics` with `beforeSend`) |
| Home page doesn't convert | 82 home views, **1** contact-page view | ✅ Proof bar (14+ years, product count, India + export, 1-day reply), export section, transparency section and a quote band on the home page; quote drawer on every "Get Quote" |
| High bounce | 63% | Same as above, plus a single H1 on home (was 2) |
| Few product-page views | 13 across all products | Plan 3: real content on product pages; UI plan: category filters |
| Nutraceuticals most visited | 17 category views; L-Glutamine 5 | Feature nutraceuticals on the home page (UI plan) |
| Search and AI already send visitors | Google 22, ChatGPT 2 | ✅ `llms.txt`, AI crawlers allowed, schema identifiers; Plan 3 content next |
| Real overseas interest | US 26% of visitors | ✅ Export section with the exports@ address and "Request an export quote" |
| Buyers are on desktops | 82% desktop | Keep dense spec tables and comparison views (UI plan) |

The raw CSVs were moved from `public/` (where anyone could download them) to `private-docs/analytics/`.

## 0. Security audit (DONE, 25 Sep 2026)

Each item was tested against the live site and database, not just read in the code.

| Area | Result | Evidence |
|---|---|---|
| Admin panel access | ✅ Locked | Every `/api/admin/*` route returns 401 when logged out; `/x-admin` redirects to login; the server verifies each session with Supabase **and** checks the email is in `ADMIN_EMAILS` (an empty list denies everyone) |
| Account takeover | ✅ Closed | Supabase sign-ups are **disabled**; 1 account exists and it is the admin; no allowlisted email is left without an account for someone to claim |
| Supabase keys in the browser | ✅ Correct | Checked all 23 live JS bundles: only the **anon** key is present, which is public by design. The service key, SMTP password, NVIDIA and Upstash keys appear in none |
| Database with the public key | ✅ Locked | Every table was tested with the anon key: leads, campaigns, templates, sends, events, suppressions and ingestion runs return **0 rows**; contacts are refused; **all writes are blocked**; only products and categories are readable (intended). The stats-counter functions are denied |
| Open redirect (email click tracking) | ✅ Blocked | Redirecting to evil.example.com falls back to the site home |
| HTTP security headers | ✅ Strong | HSTS preload, strict CSP, `frame-ancestors 'none'`, nosniff, `Referrer-Policy`, `Permissions-Policy`; admin pages are `noindex` and `no-store` |
| Secrets in git history | ✅ None | Only placeholder `SMTP_PASS=abc…` examples in the docs |
| **Dependency vulnerabilities** | 🔧 **Fixed** | Next.js had a **critical** RCE (image optimisation) → 16.3.6; sharp (high) → 0.35.4; `xlsx` (no upstream fix) moved to dev-only, since it is used by local import scripts only. Production dependencies now show **0 vulnerabilities** |
| **Personal data published** | 🚨 **Fixed locally, needs deploy** | `Fssai Certificate.pdf` was live at a public URL and its page 5 contains an officer's **Aadhaar number** and mobile. All legal PDFs moved to `private-docs/legal/` (git-ignored). The facility page now shows the licence numbers with "Verify on official portal" links |
| Wrong legal facts | 🔧 Fixed | GSTIN `…NIZS` → `07ABCFP5743N1ZS`; "Private Limited Company" → "LLP" |

### Still to do on security (you or me, as marked)
1. **You:** deploy (push) so the Aadhaar PDF disappears from the live site.
2. **You:** the GitHub repo is **public** and the Aadhaar PDF is in its history. Either make the repo private (GitHub → Settings → Danger zone → Change visibility), which is quickest, or I rewrite history with `git filter-repo` (needs a force-push, which I'll only do with your OK).
3. ✅ **Done:** two-factor login (TOTP). Turn it on in Settings → Two-factor login. It is enforced server-side (proxy and every admin API). Lost phone: `npx tsx scripts/admin-reset-2fa.ts <email>`.
4. ✅ Failed-login throttling is enforced by Supabase Auth (per-IP rate limits). ✅ **Activity log:** every admin change, email send and data export is recorded (user, action, record, IP), viewable at Admin → Activity log. Needs `scripts/admin-audit-schema.sql` run once.
5. ✅ ISO removed everywhere (site text, metadata, footer, share images, 15 product badges, the ISO choice in the product editor, a saved email). Employee range and turnover removed. "25+ / 30+ years" aligned to 14+.
5. **Later (optional):** move the CSP from `'unsafe-inline'` to per-request nonces.

---

## Phase 1: Quotes that become leads (✅ BUILT, needs `scripts/website-schema.sql` run + deploy)

Built: `src/lib/quote.ts` (catalogue matching, tested: “ashwaganda”, “boswelia”, “tulsi”, “turmric” all resolve), `src/app/api/contact/route.ts`, `src/components/quote/QuoteDrawer.tsx`, `src/app/(public)/contact/page.tsx`, `/x-admin/website-leads`, pk@ identity in `src/lib/mailer.ts`. Until the SQL runs, enquiries fall back to the old `contacts` table and are still emailed, so nothing is lost.

### 1.1 Visible quote cart
- "Get Quote" opens a **slide-over quote drawer**: product, grade/spec, quantity and unit (kg / L / MT), remove, and "Add more products" or "Request quote".
- Toast confirmation plus an animated badge count in the header.
- The cart persists across pages (the existing zustand store, extended with unit and grade).

### 1.2 Quote form (catalogue-matched)
- Fields: name*, company*, email*, phone/WhatsApp, country* (searchable), buyer type (manufacturer / brand / trader / other), products (one row each: catalogue product, quantity, unit, target price optional), message, and "Send me samples" checkbox.
- **Product matching:** typing uses the existing `/api/catalog/search` fuzzy search, so "ashwaganda" matches Ashwagandha Extract. Every line stores the real `product_id`, and free text is still allowed as "Other".
- Server-side validation (zod) plus the existing honeypot and Upstash rate limit.

### 1.3 Website Leads panel (new sidebar item, replaces "Inquiries")
- New table `website_leads` (id, created_at, name, company, email, phone, country, market, buyer_type, items jsonb, message, wants_samples, status, assigned_to, quoted_at, quote_notes, source_page, utm_*, referrer, ip_country).
- Each submission **also upserts into `leads`** (source `website`, market auto-set from the country), so campaigns can reach it.
- Panel: list with status tabs (New / Contacted / Quoted / Won / Lost), a detail drawer showing the quoted items, reply-by-email, and CSV export.

### 1.4 Emails
- **To the customer:** confirmation from **pk@** (a new third SMTP identity `pk`), listing exactly what they asked for, the response time, and links to the catalogue and WhatsApp.
- **To the team:** notification to rk@ (or pk@, your choice) with Reply-To set to the customer.
- Any failure is logged on the lead; the lead is saved before any email is attempted.

### 1.5 Env needed from you
```
SMTP_PK_HOST=smtpout.secureserver.net
SMTP_PK_PORT=465
SMTP_PK_SECURE=true
SMTP_PK_USER=pk@puravidanaturalindia.com
SMTP_PK_PASS=********
MAIL_PK_FROM_NAME=PuraVida Natural
```
Add these to `.env.local` **and** to Vercel.

---

## Phase 2: Traffic portal (admin → Traffic) (✅ BUILT, records from deploy + SQL onward)

- **First-party tracking**, no third-party account needed: a tiny beacon records page views and events into a Supabase table `site_events` (path, referrer, UTM, country from Vercel's geo header, device, session id, **no personal data, no cookies**, so no consent banner is needed).
- **Source classification:** Google organic, Bing, **AI engines (ChatGPT, Perplexity, Gemini, Copilot, Claude)**, LinkedIn, Amazon, direct, email campaigns.
- **Funnel:** product view → add to quote → form started → submitted, with conversion % per product and per source.
- Dashboard: visitors per day, top pages, top products, countries, sources, funnel, and the latest leads with the page that produced them.
- **Phase 3 add-on:** Google Search Console queries, impressions and positions via its API (needs your GSC access).
- Also switch on **Vercel Web Analytics** in the dashboard (1 click) as a cross-check.

---

## Phase 4: Amazon product page (✅ BUILT at `/selvasoul-digestive-fiber-blend`)

⚠️ Found while building: the AI-generated “What’s inside” artwork has a **wrong nutrition panel** (carbohydrate 4.1 g vs 4.3 g on the real label, sodium shown as both 0 mg and 5 mg, made-up rows “Miolassere”, “Finc”). If it is on the Amazon listing, replace it. The page uses the real label figures instead.

Page: `/products/selvasoul-digestive-fiber-blend` (and a `/shop` hub for future retail SKUs).
- Hero with the jar (front, back and side images converted to WebP; the 39 MB of PNGs become about 1.5 MB).
- The benefit, before/after, how-to-use and "what's inside" images from the folder.
- Facts from the label only: 80% isabgol husk, 20% saunf, 200 g, FSSAI licence (marketer and manufacturer).
- **"Buy on Amazon" button** → `https://amzn.in/d/09imCeph` with a UTM tag, plus "Bulk / private-label enquiry" → quote form.
- `Product` schema with `brand: Selvasoul`, `offers.url` pointing to Amazon, and `manufacturer`.
- **Brand-search capture:** the Selvasoul brand name is in the title, H1, schema and `llms.txt`, so a search for "Selvasoul" lands on this page.
- **Linking Amazon back:** Amazon does not allow external links in listings. What is allowed and useful:
  1. Register the brand on **Amazon Brand Registry** (needs the Selvasoul trademark application number) → Brand Store and A+ content.
  2. Use **Amazon Attribution** (free with Brand Registry) to create tracked links, so you can see how much Amazon sales traffic your website sends.
  3. The QR code and web address already on the label send buyers to the site.
- ⚠️ **Compliance:** the side label says "helpful in cholesterol & sugar management / IBS / weight management". FSSAI (Health Supplements) Regulations restrict disease-related claims. The web page will only say "supports digestive health and regularity". Also, the back label says "DIGESTIVE **FIVER** BLEND"; fix it at the next print run.

---

## Order and effort

| # | Work | Effort | Blocked on you? |
|---|---|---|---|
| 0 | Security fixes above | done | deploy + repo visibility |
| 1 | Quote drawer, form, Website Leads, emails | 1–2 days | pk@ credentials |
| 1b | Admin 2FA, lockout, audit log | 0.5 day | – |
| 2 | Traffic portal | 1 day | – |
| 3 | SEO / GEO / AEO (see plan 3) | 3–5 days | Search Console access |
| 4 | Amazon page | 0.5 day | trademark no. (optional) |
| UI | UI overhaul (see plan 2) | 3–4 days | – |
