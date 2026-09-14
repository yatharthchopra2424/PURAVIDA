# Email setup

Every email this site sends goes over **one authenticated SMTP
connection to the company's own mailbox**. There is no third-party
sending API — no Resend, no SendGrid, no Mailchimp.

That means the sending reputation belongs to
`puravidanaturalindia.com`, the recipient list never leaves your
infrastructure, and there is no per-message billing or monthly quota to
run into in the middle of a campaign.

| What | Where it's sent from |
|---|---|
| Quote confirmation to the customer | `src/app/api/contact/route.ts` |
| New-enquiry notification to the team | same route |
| Bulk outreach campaigns | `src/lib/campaigns.ts` |
| Admin test message | Settings → Email → *Send me a test* |

All four call `src/lib/mailer.ts`. There is one transport, one set of
credentials, one From: address.

---

## 1 · The main address

`rk@puravidanaturalindia.com` is the single company address. It is the
From: on everything, the reply-to, the inbox new enquiries land in, and
the admin login.

It was previously split across three addresses — `rk@puravida.org.in`
in the footer, `sales@puravidanatural.com` on the contact page, and a
Resend sandbox sender on outgoing mail. Two of those are on domains the
live site does not use, which is both confusing to customers and a
direct spam signal on outgoing mail.

---

## 2 · Credentials

Put these in `.env.local`, and the same values in **Vercel → Settings →
Environment Variables**. Vercel does not read your local file.

```bash
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true                    # implicit TLS — required on 465
SMTP_USER=rk@puravidanaturalindia.com
SMTP_PASS=                          # the mailbox password
MAIL_FROM_EMAIL=rk@puravidanaturalindia.com
MAIL_FROM_NAME=PuraVida Natural
MAIL_REPLY_TO=rk@puravidanaturalindia.com
CONTACT_EMAIL=rk@puravidanaturalindia.com
```

**This account is on GoDaddy Professional Email** (`secureserver.net`),
and the values above are already set for it. They match exactly what
Outlook shows under Settings → Accounts → Your accounts → SMTP
configuration.

Host and port by provider, for reference:

| Provider | Host | Port | `SMTP_SECURE` |
|---|---|---|---|
| **GoDaddy (current)** | `smtpout.secureserver.net` | **465** | **`true`** |
| Google Workspace | `smtp.gmail.com` | 587 | blank |
| Zoho Mail (India) | `smtp.zoho.in` | 465 | `true` |
| Microsoft 365 | `smtp.office365.com` | 587 | blank |

### If the password contains `$`, `#` or a backslash — escape it

Next.js runs `.env` files through **dotenv-expand**, which reads `$NAME`
as a variable reference and substitutes it away. A password containing a
dollar sign therefore reaches the app **shorter than it is on disk**,
and the only symptom is `535 Authentication Failed` from a password that
is provably correct everywhere else.

**Quoting does not help.** dotenv strips the quotes before expansion
runs. Tested against Next's own loader:

| In `.env.local` | What the app receives |
|---|---|
| `SMTP_PASS=abc$def12` | `abc` — truncated |
| `SMTP_PASS='abc$def12'` | `abc` — truncated |
| `SMTP_PASS="abc$def12"` | `abc` — truncated |
| ``SMTP_PASS=abc\$def12`` | `abc$def12` — correct |

So: **backslash-escape every `$`**. This is already done in your
`.env.local`, and `npm run mail:diagnose` now flags an unescaped one.

The same applies when you paste the password into **Vercel** — its
environment variable editor does not expand, so paste the *raw*
password there, without the backslash. The two places want different
forms, which is worth knowing before you debug it twice.

**The password** is the mailbox password — the same one Outlook holds.
GoDaddy Professional Email does not issue separate app passwords unless
two-factor is enabled on the mailbox. If it is unknown, reset it at
GoDaddy → Email & Office → Manage → Change password; that also forces
Outlook to be updated, so do it when you can reach both.

(Google and Microsoft mailboxes are different: they reject the account
password for SMTP outright and require an app-specific one.)

Port 465 is implicit TLS, 587 upgrades with STARTTLS. Getting
`SMTP_SECURE` backwards produces a connection that *hangs* rather than a
clear error — if a test sits for 15 seconds and times out, that is
usually why.

### Prove it works

```bash
npm run mail:verify
npm run mail:verify -- --to rk@puravidanaturalindia.com
```

The first connects and authenticates. The second sends a real message.
Failures are translated into the thing to actually go and fix rather
than the raw SMTP error.

The same check is in the admin panel: **Settings → Email → Test
connection / Send me a test**.

---

## 3 · DNS — do this before sending outreach

Credentials get mail *accepted*. These records get it *delivered*. Cold
email from a domain without them goes to spam, and a bad first send is
hard to recover from.

### Current state of `puravidanaturalindia.com`

Checked live — two of the three are already correct:

| Record | Status | Value |
|---|---|---|
| **SPF** | present | `v=spf1 include:secureserver.net -all` |
| **DMARC** | present | `v=DMARC1; p=quarantine; adkim=r; aspf=r; …` |
| **DKIM** | **not available** | none on any of 31 selectors |

**DKIM is not something you can fix here, and that is fine.** The MX
records point at `smtp.secureserver.net` — GoDaddy's own email platform,
which does not publish DKIM keys for customer domains. There is no
setting to switch on and no record to add; the key does not exist to
publish.

It is also not blocking you. DMARC uses relaxed SPF alignment
(`aspf=r`), and mail sent through `smtpout.secureserver.net` is covered
by the SPF include, so messages authenticate and pass DMARC on SPF
alone. That is a working configuration, not a degraded one.

What DKIM would add is a signature that survives *forwarding* — SPF
breaks when a recipient auto-forwards your mail to another address,
DKIM does not. If that matters enough, the only route is moving the
mailbox to a platform that offers it; Microsoft 365 (which GoDaddy also
resells) publishes DKIM as two CNAMEs and would give you all three
records. That is a mailbox migration, not a DNS edit — worth doing
deliberately, not mid-campaign.

Note `p=quarantine` is already active, so anything that fails
authentication goes straight to spam rather than being merely flagged.
Do not change the From: address to a domain outside this SPF record.

### If you are setting this up on another domain

At your DNS provider:

**SPF** — one TXT record at the root. You must have exactly one; if a
record already exists, merge into it rather than adding a second.

```
Type: TXT   Name: @   Value: v=spf1 include:_spf.google.com ~all
```

(Use your provider's include: `zoho.in` → `include:zoho.in`,
Microsoft 365 → `include:spf.protection.outlook.com`.)

**DKIM** — the CNAME or TXT record your mail provider generates. Find it
under the provider's "email authentication" or "DKIM" settings and paste
it in verbatim.

**DMARC** — one TXT record. Start permissive so you get reports without
mail being rejected while you check:

```
Type: TXT   Name: _dmarc   Value: v=DMARC1; p=none; rua=mailto:rk@puravidanaturalindia.com
```

Once the reports look clean for a week or two, tighten `p=none` to
`p=quarantine`.

### Check the result

Send a test from the composer to **mail-tester.com** and read the score.
Aim for 9/10 or better before any real outreach. It will tell you
exactly which of the three records is missing or malformed.

---

## 4 · Behaviour when SMTP is not configured

Nothing crashes. The contact form still:

- saves the enquiry to the `contacts` table, and
- prints it to the server log,

so no lead is lost while you are setting credentials up. The customer
simply does not get a confirmation email. The admin panel shows the
state plainly in Settings, and a campaign refuses to start rather than
queueing hundreds of sends that cannot go out.

The contact endpoint only returns an error to the visitor if **both**
the database write and the notification failed — that is the only case
where the enquiry is genuinely lost.

---

## 5 · Inbox placement, and what was traded for it

Campaign mail is deliberately built to look like a message a person
typed, because a cold email filed under Gmail's **Promotions** tab is
not read by a purchase manager and is therefore worth nothing.

Removed, at the owner's direction, in service of that:

| Removed | Why it was a Promotions signal |
|---|---|
| `List-Unsubscribe` / `List-Unsubscribe-Post` headers | The clearest "this is a mailing list" declaration a sender can make. Gmail uses them directly to sort into Promotions. |
| Visible "Unsubscribe" link | Same tell, in the part the reader looks at. |
| "You received this because…" line | Announced the message as bulk in the one place a reader judges whether it was written for them. |
| `Precedence: bulk` | Non-standard, and read by several filters as self-declared mass mail. |
| Open pixel + click rewriting | Now **off by default**, opt-in per campaign. A 1×1 image is a textbook bulk marker, and links pointing at a redirector rather than the site they claim are another. |

**What this costs, stated plainly.** Recipients no longer get a
one-click opt-out in Gmail or Outlook, and there is no unsubscribe link
in the message. A visible opt-out is what CAN-SPAM and its equivalents
ask for in the body, so this configuration carries legal exposure for
recipients in those jurisdictions — and, practically, someone who wants
out has no option but to reply or hit "report spam", and complaints are
what damage a sending domain.

The mitigations that remain:

- The **suppression list is still enforced on every send**, so anyone
  who asks to be removed stays removed, across every future campaign.
- `/api/unsubscribe/<token>` still works, so links in mail already sent
  continue to function.
- Marking a lead **do not contact** in the admin suppresses them too.

When someone asks to be removed, set their lead status to *Do not
contact* in `/x-admin/leads`. That writes to the suppression list and no
campaign will reach them again.

### Still worth reviewing

The signature carries **8 links** — the Amazon product link, three
mailbox addresses, the website, phone and email. A genuinely personal
email rarely has more than two or three, and a retail `amzn.in` link in
B2B export outreach is itself a Promotions cue.

To drop the product plug from campaign mail only, one line in
`src/lib/campaign-render.ts` — pass `includePromo: false` to
`renderSignature()`. The signature keeps it everywhere else.

## 6 · Rate limits

The mailbox's own limit is the ceiling on everything, and **GoDaddy's is
the tightest of the common providers**:

| Provider | Roughly |
|---|---|
| **GoDaddy Professional Email (current)** | **250–500 relays/day**, depending on plan |
| Google Workspace | 2,000 recipients/day |
| Zoho Mail | ~1,000/day on most plans |
| Microsoft 365 | 10,000/day, 30 msgs/minute |

This matters for planning. The IPHEX list is 642 contacts, so **one
campaign to the whole list is a two- to three-day send**, not an
afternoon — and the contact form shares the same quota, so a campaign
that exhausts it also stops customers getting their quote
confirmations.

Settings that fit a 500/day mailbox:

- `batch_size` **8** in the composer. With the dispatcher's 5-minute
  schedule that is ~96/hour and ~460 over a 5-hour window.
- Better still, send to the leads worth sending to. Filtering to
  priority A and B is a few hundred contacts, not 642, and they are the
  ones likely to reply.
- Pause overnight; a steady daytime trickle looks far more like a
  person than 500 messages at 3am.

Exceeding the limit gets the mailbox rate-limited or suspended, which
takes down the contact form too, not just outreach. If the volume needs
to grow beyond this, the answer is a dedicated sending mailbox on a
subdomain, not a bigger batch size.

---

## 7 · Troubleshooting

**"Invalid login" / 535 — and the CLI says the password is fine**

This is the confusing one, and it is usually not the password.
Next.js reads `.env.local` **once, at startup**. A password corrected
while `npm run dev` is running is a password that process has never
seen, so the CLI and the app disagree about credentials that are
identical on disk.

1. Restart the dev server (or redeploy, in production).
2. If it still fails, test the credentials outside the app entirely:

   ```bash
   npm run mail:diagnose
   ```

   That tries every plausible host/port/TLS combination with the stored
   credentials, reports which the server accepts, and inspects the
   stored password for the whitespace and quoting damage `.env` files
   routinely inflict — without ever printing it.

If `mail:diagnose` reports **rejected credentials on every host**, then
it genuinely is the password:

- The mail client may be holding an older saved password, or using
  OAuth, so what you typed there is not what it authenticates with.
  Reset it at GoDaddy → Email & Office → Manage → the mailbox → Change
  password, and update both the client and `.env.local`.
- Two-step verification on the mailbox means SMTP needs an app
  password, not the login password.
- A brand-new mailbox can take up to 24 hours before SMTP relay works
  at all.

**Connection hangs then times out** — `SMTP_SECURE` does not match the
port. `true` for 465, blank for 587.

**"wrong version number"** — same cause, the other way around.

**Mail sends but lands in spam** — DNS, not code. Work through §3.

**Contact form works locally, sends nothing in production** — the
credentials are in `.env.local`, which never leaves your machine. Add
them in Vercel and redeploy.

**Campaign rows all `failed`** — open the campaign page; it dispatches
from the browser and surfaces the real SMTP error, which the queue rows
only summarise.
