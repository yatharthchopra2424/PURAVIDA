# Email & SMTP — how it actually works, and what to know

## Short answer: there is no SMTP

The contact form doesn't use SMTP (i.e. it never connects to a mailbox like
Gmail/Outlook directly). It uses **Resend** (resend.com), an email-sending
API — your server calls Resend's API with the message content, and Resend
handles delivery. This is deliberate and is the better choice here:

- No mailbox password sitting on the server.
- Better deliverability/reputation than a personal or shared mailbox sending
  transactional email.
- Already wired up and working for the team notification.

If you specifically want literal SMTP (your own mailbox's host/port/
username/password via `nodemailer`), that's a different, larger change — say
so and I'll do it, but the recommendation below (verify a domain in Resend)
gets you everything SMTP would, without storing a mailbox password.

## What happens today when someone submits the contact form

File: `src/app/api/contact/route.ts`

1. The submission is saved to your Supabase `contacts` table (so it's never
   lost even if email fails).
2. **Team notification** — an email goes to `CONTACT_EMAIL`
   (currently `ps@puravidanaturalindia.com`, set in `.env`) with the
   inquiry details. `replyTo` is set to the customer's email, so hitting
   Reply in your inbox goes straight to them.
3. **Customer confirmation** (added this session) — a branded "we got your
   inquiry" email goes to the address the customer typed in.

Both emails currently send `from` **`onboarding@resend.dev`** — Resend's
shared sandbox address. This has one hard limitation:

> **The sandbox sender can only deliver to the email address on your own
> Resend account.** It cannot reach arbitrary customers. So right now, the
> *customer confirmation* silently fails (logged as an error server-side —
> the customer just doesn't get it), while the *team notification* only
> works at all because it happens to point at your own inbox.

### The fix — verify your domain in Resend (~10 minutes, no code changes)

1. https://resend.com/domains → **Add Domain** → enter
   `puravidanaturalindia.com` (your live domain).
2. Resend shows 2–3 DNS records (SPF + DKIM, usually TXT/CNAME). Add them at
   wherever your domain's DNS is managed (your registrar, or Vercel's DNS if
   you use Vercel for the domain).
3. Wait for Resend to show the domain as **Verified** (usually minutes,
   occasionally longer for DNS propagation).
4. In Vercel → Settings → Environment Variables, add:
   ```
   RESEND_FROM=PuraVida Quotes <quotes@puravidanaturalindia.com>
   ```
   (or any address on the verified domain — `quotes@`, `hello@`, `sales@`,
   your call).
5. Redeploy. Both emails now send from your own domain and can reach
   anyone — not just your own inbox.

## The three different email addresses currently on your site

This is worth knowing about even though it's not something I changed: your
site shows **three different email addresses**, on **three different
domains**, none of which is used consistently:

| Address | Where it's shown | Domain |
|---|---|---|
| `rk@puravida.org.in` | Top bar (every page) + footer | `puravida.org.in` |
| `sales@puravidanatural.com` | Contact page "Direct Contact" card | `puravidanatural.com` |
| `ps@puravidanaturalindia.com` | Nowhere visible — only the backend recipient for form submissions | `puravidanaturalindia.com` (your actual live domain) |

Only the third one matches your real domain
(`www.puravidanaturalindia.com`). A visitor who emails the address in your
header (`rk@puravida.org.in`) is writing to a completely different domain
than the one they're browsing — which reads as unprofessional at best, and
at worst makes buyers wonder if they're on a copycat/phishing-adjacent site
before they even get to certifications and pricing.

**I didn't consolidate these myself** because I don't know which mailbox you
actually want customers to end up in. If you tell me the one address you
want used everywhere (ideally `@puravidanaturalindia.com` to match the
domain), I'll make `COMPANY.email`, `COMPANY.salesEmail`, and `CONTACT_EMAIL`
all point at it — one line change each in `src/lib/constants.ts` and
Vercel's env vars.
