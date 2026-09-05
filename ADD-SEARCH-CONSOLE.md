# Getting listed on Google & Bing — manual steps

Everything code-side is ready (sitemap, robots.txt, verification meta tag
support). These last steps require signing into your own Google/Microsoft
accounts, so they're yours to do — takes about 15 minutes total.

## 1 · Google Search Console

1. Go to https://search.google.com/search-console and sign in with the
   Google account you want to own this property.
2. Click **Add property** → choose **URL prefix** → enter
   `https://www.puravidanaturalindia.com`.
3. Under verification methods, pick **HTML tag**. Google shows a line like:
   ```html
   <meta name="google-site-verification" content="AbCdEf123..." />
   ```
   Copy only the `content` value (the part in quotes).
4. In Vercel → Settings → Environment Variables, add:
   ```
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=AbCdEf123...
   ```
5. Redeploy. The tag now renders in every page's `<head>` automatically
   (`src/app/layout.tsx`).
6. Back in Search Console, click **Verify**.
7. Once verified: **Sitemaps** (left nav) → enter `sitemap.xml` → **Submit**.
   Full URL: `https://www.puravidanaturalindia.com/sitemap.xml`.
8. Coverage will start populating over the next few days to weeks as Google
   crawls the ~260 product pages.

## 2 · Bing Webmaster Tools

Bing can **import directly from Google Search Console** — no separate
verification needed, as long as you did step 1 first.

1. Go to https://www.bing.com/webmasters and sign in (Microsoft, Google, or
   Facebook account all work).
2. Choose **Import from Google Search Console**.
3. Authorize access and select the property you just verified.
4. Bing pulls in your sitemap and verification automatically. Confirm the
   sitemap shows up under **Sitemaps** — if not, submit
   `https://www.puravidanaturalindia.com/sitemap.xml` manually.

If you'd rather verify Bing independently instead of importing:
same flow as Google — **Add a site** → **HTML Meta Tag** method → copy the
`content` value → set it as `NEXT_PUBLIC_BING_SITE_VERIFICATION` in Vercel →
redeploy → verify.

## 3 · Also worth doing once verified

- **Rich Results Test** — https://search.google.com/test/rich-results —
  paste a product URL (e.g. a bergamot oil page) and confirm the `Product`
  and `BreadcrumbList` structured data validates.
- **Request indexing** on the homepage and 2–3 flagship product pages from
  inside Search Console (URL Inspection → Request Indexing) to nudge Google
  ahead of the normal crawl schedule.

## 4 · One more thing this touches: the contact form confirmation email

The customer-confirmation email (added this session) uses the same Resend
account as your existing lead-notification email. Resend's default sender —
`onboarding@resend.dev` — can only deliver to *your own* Resend account
address, not to arbitrary customers. Until you verify a sending domain, the
confirmation email will silently fail (the lead is still saved and you still
get notified — only the customer's "we got it" email won't arrive).

Fix, ~10 minutes:
1. https://resend.com/domains → **Add Domain** → `puravidanaturalindia.com`
   (or whichever domain you want mail to come from).
2. Add the DNS records Resend shows you (SPF/DKIM, usually 2–3 TXT/CNAME
   records) at your domain registrar.
3. Once verified, set in Vercel:
   ```
   RESEND_FROM=PuraVida Quotes <quotes@puravidanaturalindia.com>
   ```
4. Redeploy. Both emails (customer confirmation + team notification) now
   send from your own domain instead of the shared sandbox address, which
   also means they're far less likely to land in spam.
