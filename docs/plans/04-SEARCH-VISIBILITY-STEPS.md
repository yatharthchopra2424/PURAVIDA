# 04: Search visibility, step by step (things only you can do)

Written 25 Sep 2026 for **www.puravidanaturalindia.com**. Every value below comes from your own documents and site. Nothing here needs code: it is account set-up in Google, Bing and the trade directories.

Do them in this order. Budget: about 45 minutes for Part 1 and 2, about 2 hours for Part 3 and 4, then a little each week for Part 5.

---

## Part 0. Decide your "name, address, phone" first (10 minutes)

Google, Bing, IndiaMART and TradeIndia all compare these three facts across the web. If they disagree, the listings are treated as different businesses and trust drops. **I found three disagreements in your own materials:**

| Fact | On the website | In your certificates / PDFs | Decide |
|---|---|---|---|
| Phone | +91-9811647596 | FSSAI and Udyam list mobile **9711262868** | Pick ONE public number for all listings |
| Email | rk@puravidanaturalindia.com | Certificates and the Product List PDF use **rk@puravida.org.in** | Use the .com address everywhere public |
| Website | www.puravidanaturalindia.com | Product List PDF footer says **www.puravida.org.in**, and that old domain still loads (200) | See below |
| Address | "169, Uttam Nagar West, New Delhi - 110059" (short) | GST: "Plot No 169,170,171, UGF Floor Front Side Middle RHS, Khushi Ram Park, Uttam Nagar West, New Delhi, Delhi 110059" | Use the long GST form on every listing |

**✅ DECIDED (25 Sep 2026): use exactly this everywhere. The website, structured data and llms.txt already use it.**

```
Business name:   PuraVida Natural
Address:         Plot No. 169, 170, 171, UGF Floor, Front Side Middle RHS,
                 Khushi Ram Park, Uttam Nagar West, New Delhi, Delhi 110059, India
Phone:           +91 98116 47596
Email:           rk@puravidanaturalindia.com
Website:         https://www.puravidanaturalindia.com/
Hours:           Monday to Saturday, 9:00 AM to 6:00 PM IST
```

Where "Business name" is asked for the **legal** entity (GST, IndiaMART registration form), enter `Pura Vida Natural LLP`; for every public display name use `PuraVida Natural`.

Two follow-ups (tell me and I'll do the code parts):
1. **The old domain puravida.org.in.** If you own it, ask your domain host to set a permanent (301) redirect from it to `https://www.puravidanaturalindia.com/`, so old links and the printed PDF pass their value to the new site.
2. **The Product List PDF** still prints the old website and email. Send me an updated PDF (or the source file) and I'll replace it; until then the site shows it under "Download Catalog".

Keep a note of the final phone you choose: use it word for word in every step below.

---

## Part 1. Google Search Console (about 25 minutes)

Your property is the **Domain property** `puravidanaturalindia.com` (the URL bar shows `sc-domain:puravidanaturalindia.com`). That is correct and covers www and non-www.

### 1.1 Why your Rhodiola test said "404"
You inspected `https://puravidanaturalindia.com/rhodiola`. **That page does not exist**, so Google was right. Product pages live under their category. Always inspect the full address below.

### 1.2 Request indexing: the exact URLs
For each URL: paste it in the top search bar ("Inspect any URL in puravidanaturalindia.com") → wait for the result → **Request indexing** → wait for "Indexing requested".

| # | Page | Exact URL to paste |
|---|---|---|
| 1 | Home page | `https://www.puravidanaturalindia.com/` |
| 2 | Encapsulated oleoresins | `https://www.puravidanaturalindia.com/encapsulated-oleoresins` |
| 3 | Rhodiola | `https://www.puravidanaturalindia.com/products/herbal-extracts/rhodiola-rosea-extract` |
| 4 | Bilberry | `https://www.puravidanaturalindia.com/products/herbal-extracts/bilberry-extract` |
| 5 | Guggul | `https://www.puravidanaturalindia.com/products/herbal-extracts/guggul-extract` |
| 6 | Buyer guides (index) | `https://www.puravidanaturalindia.com/guides` |
| 7 | Guide: HPLC vs UV | `https://www.puravidanaturalindia.com/guides/hplc-vs-uv-vs-gravimetric-coa` |
| 8 | Guide: ashwagandha grades | `https://www.puravidanaturalindia.com/guides/ashwagandha-extract-grades-explained` |
| 9 | Selvasoul page | `https://www.puravidanaturalindia.com/selvasoul-digestive-fiber-blend` |
| 10 | Nutraceuticals category | `https://www.puravidanaturalindia.com/products/nutraceuticals` |

**Limits:** Google allows roughly 10 to 12 manual requests a day. Do items 1 to 5 today and the rest tomorrow. If one says "URL is not on Google", that is normal for new pages: request indexing anyway.

**If the page shows a "URL is not available to Google" error:** first check you typed the exact address above (the most common cause). If the exact address still fails, click **Test live URL** and screenshot the "Page fetch" section to me.

### 1.3 Resubmit the sitemap
1. Left menu → **Indexing → Sitemaps**.
2. In "Add a new sitemap" type `sitemap.xml` (it becomes `https://www.puravidanaturalindia.com/sitemap.xml`) → **Submit**.
3. If it is already listed, click it → **See page indexing**, and check the status says "Success" and "Discovered URLs: 276". It refreshes hourly on its own; resubmitting mainly makes Google look again now.

### 1.4 The 212 "Discovered – currently not indexed" pages
1. **Indexing → Pages**.
2. Click **Discovered – currently not indexed**.
3. These are the product pages Google judged too thin. They now have specifications and FAQs. Click **Validate fix** (top right of that report) to ask Google to re-check them. Expect **2 to 6 weeks** for most to move to "Indexed". There is nothing else to do; do not resubmit them one by one.
4. The 3 "Page with redirect" items are the non-www and http versions redirecting to www. That is correct and can be ignored.

### 1.5 Check back
| When | Where | What you want to see |
|---|---|---|
| +3 days | Pages report | "Indexed" count rising above 56 |
| +1 week | Performance → Queries | Impressions for "rhodiola extract", "bilberry extract", "guggul extract", "encapsulated oleoresin" |
| +4 weeks | Performance → Pages | product pages getting clicks; US impressions turning into clicks |

---

## Part 2. Bing Webmaster Tools (about 20 minutes)

The site is already added (`puravidanaturalindia.com`). Bing's index also feeds **ChatGPT search and Microsoft Copilot**, so this matters for AI visibility too.

### 2.1 What Bing flagged and what is done
| Bing recommendation | Status |
|---|---|
| **Set up IndexNow** | ✅ **Done.** The key file is live at `https://www.puravidanaturalindia.com/96da217594573022c990f898e2cf0e04.txt` and I submitted all 276 URLs (accepted, HTTP 200). |
| **Meta descriptions too short** (berberine, aloe vera, black pepper oleoresin) | ✅ **Fixed.** Every one of the 256 product pages now has a 144 to 158 character description, and titles are 37 to 58 characters with no duplicates. Bing scanned the old pages before this change. |
| **Not enough inbound links from high-quality domains** | ⏳ **Only you can do this**: see Part 5. |

### 2.2 Steps for you
1. **Sitemaps** (left menu): **Submit sitemap** → `https://www.puravidanaturalindia.com/sitemap.xml`.
2. **IndexNow** (left menu): it should now show submissions received. If it says none, wait 15 minutes and refresh.
3. **Site Scan** (left menu): **Start a new scan** for the whole site, and open the result in about 24 hours. The three meta-description errors should be gone.
4. **URL Inspection**: paste the same five URLs from Part 1.2, click **Request indexing**.
5. **AI Performance (Beta)** (left menu): open it once a week. It shows how often Copilot and Bing AI cite your pages, which is the direct measure of the GEO work.
6. **Recommendations**: after the rescan, only "inbound links" should remain.

### 2.3 Telling search engines about new pages in future
Whenever I add or change pages, after the deploy finishes run this on your PC in the project folder:
```
npm run seo:indexnow
```
It resubmits the sitemap in seconds. If the answer is 403 "verification not completed", wait 5 minutes and run it again.

---

## Part 3. Google Business Profile (about 40 minutes)

Purpose: a Google panel for your brand searches ("pura vida natural", where you already rank about 4.6), a phone and website button, and one more consistent listing that AI engines can cite.

### 3.1 Check eligibility first (2 minutes)
Google only allows a profile for a business with a **real, staffed location or a service area**.
- If customers or couriers can visit the Uttam Nagar office during your hours → create a normal profile with the address shown.
- If it is an office nobody visits → choose **"I deliver goods and services to my customers"** (service area business) and **hide the address**. Never use a made-up address or a virtual office: it gets the profile suspended.

### 3.2 Create it
1. Go to **business.google.com** and sign in with the Google account you want to own it (use your company Gmail, not a personal one you may lose).
2. **Business name:** `Pura Vida Natural`. Use the real trading name only. **Do not add keywords** ("Herbal Extract Supplier India") to the name: Google removes them.
3. **Category (primary):** search the picker for **Manufacturer**, **Wholesaler**, or **Herbal medicine supplier** and choose the most specific one it offers that is true for you. (The exact list changes; pick the closest, do not pick "Store".) Add up to 5 more, for example *Import export company* and *Food and drink wholesaler*, only if true.
4. **Location / service area:** per 3.1. Use the long address from Part 0.
5. **Phone and website:** your Part 0 phone, and `https://www.puravidanaturalindia.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp` (the tags let your Traffic page count visits from the profile).
6. **Hours:** Mon to Sat 9:00 to 18:00, Sunday closed.
7. **Verification:** choose video, phone or postcard, whichever Google offers. A postcard goes to the address, so someone must be there.

### 3.3 Fill in the profile (this is what makes it rank)
**Short description** (paste, keep under 750 characters):
```
Pura Vida Natural LLP supplies standardised herbal extracts, essential oils,
oleoresins and nutraceutical ingredients from New Delhi to manufacturers, brands
and traders in India and overseas. 14+ years of experience. FSSAI licensed and Halal
India certified, with a certificate of analysis on request. Browse 250+ ingredients
and request a quote: we reply within one business day.
```
- **Products:** add one product per category (Herbal Extracts, Essential Oils, Nutraceuticals, Oleoresins, Encapsulated Oleoresins, Selvasoul Digestive Fiber Blend) with a photo and the matching page URL from the site.
- **Photos:** at least 10: office or warehouse front, product jars (from the Selvasoul set), packed drums or bags, team. No stock photos.
- **Attributes / more info:** opening date if offered, languages (English, Hindi).
- **Posts:** one short post a month linking to a guide, e.g. "How to read a COA".
- **Q&A:** add the three questions you get most (MOQ, samples, export) and answer them yourself.

### 3.4 Mistakes that cause suspension
Keyword stuffing the name, a fake or shared address, editing the name/address repeatedly right after verifying, and asking for reviews in exchange for discounts.

---

## Part 4. IndiaMART and TradeIndia (about 2 hours each)

Buyers search these platforms directly, and AI engines and Google read them, so each listing is both a lead source and a backlink.

### 4.0 Before you start
- Have ready: GST certificate, Udyam certificate, FSSAI licence, a working mobile for OTP, and the Part 0 details.
- **Say only what is true.** Your Udyam certificate lists "Trading" as the major activity (with manufacturing codes as well). Choose the business type that matches how you really operate. Buyers and the platforms check GST against what you claim.
- Do **not** upload the FSSAI PDF to a public profile (it contains a personal ID number). Use a copy with that number blacked out.

### 4.1 IndiaMART (indiamart.com → "Sell on IndiaMART")
1. Register with your business mobile and the Part 0 email, and complete the OTP.
2. **Company profile:** legal name `Pura Vida Natural LLP`, Part 0 address, GSTIN `07ABCFP5743N1ZS`, website, year of establishment of the LLP **2022** (or the true year the business started trading; do not claim 2000).
3. **Company description** (paste):
   ```
   Pura Vida Natural LLP, New Delhi, supplies standardised herbal extracts, essential
   oils, oleoresins (including encapsulated oleoresins for masala and seasoning blends)
   and nutraceutical ingredients to manufacturers, brands and traders in India and
   overseas. The team has 14+ years of experience. FSSAI licensed; Halal India certified
   product range; certificate of analysis on request.
   ```
4. **Products:** add your best 20 first (ashwagandha, curcumin, boswellia, moringa, guggul, rhodiola, bilberry, the 20 oleoresins, peppermint/tea tree/lavender oil). For each: name, botanical name, standardisation (copy from the product page), packing "as per requirement", price **"Get latest price"**, and the product photo. Add the encapsulated oleoresin range as its own product group.
5. **Website field on each product and on the profile:** link the matching page on your site.
6. **Leads:** turn on the mobile app and email alerts, and reply within the hour. Reply speed drives your rank on the platform.
7. **Optional, paid:** "TrustSEAL Verified" badge. Worth it only after you have listings and leads.

### 4.2 TradeIndia (tradeindia.com → "Register free")
1. Same details as 4.1. Category path: Health and Beauty / Herbal products → Herbal extracts; Chemicals → Oleoresins; Food ingredients → Spices oleoresin.
2. Reuse the description from 4.1 and add your top 20 products.
3. Complete the profile to 100%: their ranking uses completeness.

### 4.3 Also worth 20 minutes each (same details)
ExportersIndia, Justdial (Business Free Listing), Sulekha. They are free, add consistent name/address/phone, and each gives a link.

### 4.4 Amazon Selvasoul
Amazon does not allow links to outside sites inside a listing. What you can do: register the **Selvasoul** brand under Amazon **Brand Registry** (needs the trademark application number), then use **Amazon Attribution** to see how much Amazon traffic your site sends. The site's Selvasoul page already links to the listing.

---

## Part 5. Getting quality backlinks (what Bing asked for)

Bing's message: "not enough inbound links from high-quality domains." A new site starts with almost none; the fix is a steady flow of **real** mentions, not bought links (paid link packages get sites penalised by both Google and Bing).

### Do these in the next 30 days
| Action | Effort | Why it counts |
|---|---|---|
| Parts 3 and 4: Google profile, IndiaMART, TradeIndia, ExportersIndia, Justdial | 4 to 5 hours | Established domains that link to you |
| **LinkedIn company page** (name, address, phone as Part 0; add the website; post each guide) | 1 hour | High-authority profile; employees who list the company help it |
| **YouTube channel**: 2 to 3 short videos (facility, packing, what a COA looks like), website link in each description | half a day | High-authority link and a video result in Google |
| **Facebook and Instagram page** with the website in the bio | 30 minutes | Consistent identity across the web |
| Share the five guides on LinkedIn groups for nutraceutical, F&B and herbal-ingredient buyers | 15 minutes each | People link to useful guides |
| Ask 3 to 5 **existing customers or suppliers** for a link to your site from their "suppliers" or "partners" page | 1 email each | The most valuable kind: relevant and real |

### Check whether you qualify (membership listings)
Export-promotion and trade bodies publish member directories that link to member websites. Look at the eligibility for: **Spices Board India** (relevant to oleoresins), **Chemexcil**, **Pharmexcil**, and **FIEO**. Membership is real and has a cost, so only join what you would use for exporting anyway.

### Do NOT
Buy links, join "link exchange" groups, or spam blog comments. It will lower your ranking instead of raising it.

### How to measure
- Bing Webmaster Tools → **Backlinks**: shows who links to you (weekly).
- Google Search Console → **Links** (left menu): same for Google.
- Aim for 15 to 25 real referring domains in 3 months.

---

## Weekly routine (15 minutes)
1. Search Console → Performance: new queries and pages getting impressions.
2. Search Console → Pages: "Indexed" count going up.
3. Bing → AI Performance: any citations.
4. Admin → **Traffic**: sources (Google, Bing, ChatGPT, Perplexity, IndiaMART) and the quote funnel.
5. Admin → **Website Leads**: reply to every new request within one business day.
6. IndiaMART and TradeIndia: reply to every lead.

## If something looks wrong
Send me a screenshot of the exact page and error and the URL you used. The most common causes: a mistyped URL (like `/rhodiola`), a phone or address that differs between listings, or the new page not indexed yet (give it days, not hours).
