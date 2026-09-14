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

Email no longer goes through Resend — the site sends over a direct SMTP
connection to the company mailbox instead. See `EMAIL-SETUP.md` for the
current setup.

What still matters for deliverability is the DNS side, and it is the same
work either way: the sending domain needs **SPF**, **DKIM** and **DMARC**
records, or the confirmation email lands in spam. `EMAIL-SETUP.md` §3 has
the records.
