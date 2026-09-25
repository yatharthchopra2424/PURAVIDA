import { COMPANY } from "@/lib/constants";
import { absoluteUrl } from "@/lib/site";

/** Escapes text before it goes into an HTML email body. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type CartItem = { name: string; quantity: number };

export interface ContactEmailData {
  name: string;
  email: string;
  product?: string;
  quantity?: string;
  description?: string;
  cartItems: CartItem[];
}

// White wordmark — the dark header banner below needs the light variant.
// CSS `filter` (to recolor the green logo) is unreliable across email
// clients, so the pre-made white asset is used directly instead.
const LOGO_URL = absoluteUrl("/images/logo-bg-rm.png");

/** Shared wrapper so both emails look like the same brand. */
function wrapEmail(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f2;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e9e2;">
            <tr>
              <td style="background:#0f2417;padding:24px 32px;">
                <img src="${LOGO_URL}" alt="${esc(COMPANY.name)}" height="36" style="display:block;height:36px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1a2b1e;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f4f6f2;color:#6b7568;font-size:12px;line-height:1.6;">
                ${esc(COMPANY.name)} &middot; ${esc(COMPANY.address)}<br/>
                ${esc(COMPANY.phone)} &middot; ${esc(COMPANY.email)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function cartRows(cartItems: CartItem[]): string {
  if (cartItems.length === 0) return "";
  const rows = cartItems
    .map(
      (item) =>
        `<tr><td style="padding:4px 0;color:#1a2b1e;">${esc(item.name)}</td><td style="padding:4px 0;color:#6b7568;text-align:right;">qty ${item.quantity}</td></tr>`
    )
    .join("");
  return `<p style="margin:16px 0 4px;font-weight:600;">Quote cart</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

/** Sent to the customer immediately after they submit the form. */
export function renderCustomerConfirmationEmail(data: ContactEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `We've received your inquiry — ${COMPANY.name}`;

  const html = wrapEmail(`
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f2417;">Thank you, ${esc(data.name)}.</p>
    <p style="margin:0 0 16px;">
      We've received your inquiry${data.product ? ` about <strong>${esc(data.product)}</strong>` : ""}
      and a member of our export team will get back to you within one business day.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2;border-radius:8px;padding:16px;margin:0 0 16px;">
      <tr><td style="padding:4px 0;color:#6b7568;width:120px;">Product</td><td style="padding:4px 0;">${esc(data.product || "General inquiry")}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7568;">Quantity</td><td style="padding:4px 0;">${esc(data.quantity || "Not specified")}</td></tr>
      ${data.description ? `<tr><td style="padding:4px 0;color:#6b7568;vertical-align:top;">Details</td><td style="padding:4px 0;">${esc(data.description)}</td></tr>` : ""}
    </table>
    ${cartRows(data.cartItems)}
    <p style="margin:16px 0 0;color:#6b7568;">
      If anything above needs correcting, just reply to this email — it reaches our team directly.
    </p>
  `);

  const text = `Thank you, ${data.name}.

We've received your inquiry${data.product ? ` about ${data.product}` : ""} and a member of our export team will get back to you within one business day.

Product: ${data.product || "General inquiry"}
Quantity: ${data.quantity || "Not specified"}
${data.description ? `Details: ${data.description}\n` : ""}${
    data.cartItems.length > 0
      ? `\nQuote cart:\n${data.cartItems.map((i) => `  - ${i.name} (qty ${i.quantity})`).join("\n")}\n`
      : ""
  }
Reply to this email if anything needs correcting.

${COMPANY.name}
${COMPANY.address}
${COMPANY.phone}`;

  return { subject, html, text };
}

/** Sent to the business inbox for every new inquiry. */
export function renderAdminNotificationEmail(data: ContactEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Quote Request — ${data.product || "General Inquiry"} from ${data.name}`;

  const html = wrapEmail(`
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f2417;">New quote inquiry</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2;border-radius:8px;padding:16px;margin:0 0 16px;">
      <tr><td style="padding:4px 0;color:#6b7568;width:120px;">From</td><td style="padding:4px 0;">${esc(data.name)} &lt;${esc(data.email)}&gt;</td></tr>
      <tr><td style="padding:4px 0;color:#6b7568;">Product</td><td style="padding:4px 0;">${esc(data.product || "Not specified")}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7568;">Quantity</td><td style="padding:4px 0;">${esc(data.quantity || "Not specified")}</td></tr>
      ${data.description ? `<tr><td style="padding:4px 0;color:#6b7568;vertical-align:top;">Details</td><td style="padding:4px 0;">${esc(data.description)}</td></tr>` : ""}
    </table>
    ${cartRows(data.cartItems)}
    <p style="margin:16px 0 0;color:#6b7568;">Reply to this email to respond directly to the customer.</p>
  `);

  const cartSection =
    data.cartItems.length > 0
      ? `\n\nQuote Cart:\n${data.cartItems.map((item) => `  • ${item.name} — qty ${item.quantity}`).join("\n")}`
      : "";

  const text = `New quote inquiry from ${data.name} <${data.email}>

Product: ${data.product || "Not specified"}
Quantity: ${data.quantity || "Not specified"}

Additional Details:
${data.description || "None provided"}${cartSection}`;

  return { subject, html, text };
}

// ── Website quote requests (multi-product, catalogue-matched) ──────

export interface QuoteEmailItem {
  name: string;
  slug: string | null;
  categorySlug: string | null;
  quantityLabel: string;
  grade: string | null;
  matched: boolean;
  requestedAs: string | null;
}

export interface QuoteEmailData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  country?: string;
  buyerType?: string | null;
  items: QuoteEmailItem[];
  message?: string;
  wantsSamples?: boolean;
  reference: string;
  sourcePage?: string | null;
  adminUrl?: string;
}

function quoteItemRows(items: QuoteEmailItem[], forAdmin: boolean): string {
  if (!items.length) return "";
  const rows = items
    .map((i) => {
      const link = i.slug && i.categorySlug ? absoluteUrl(`/products/${i.categorySlug}/${i.slug}`) : null;
      const name = link
        ? `<a href="${link}" style="color:#0f2417;font-weight:600;text-decoration:none;">${esc(i.name)}</a>`
        : `<span style="font-weight:600;">${esc(i.name)}</span>`;
      const notes = [
        i.grade ? `Grade: ${esc(i.grade)}` : "",
        forAdmin && i.requestedAs ? `typed as “${esc(i.requestedAs)}”` : "",
        forAdmin && !i.matched ? `<span style="color:#b45309;">not in catalogue</span>` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e9e2;">${name}${notes ? `<br/><span style="font-size:12px;color:#6b7568;">${notes}</span>` : ""}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e9e2;text-align:right;white-space:nowrap;color:#1a2b1e;">${esc(i.quantityLabel)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e9e2;border-radius:8px;margin:0 0 16px;border-collapse:separate;">
    <tr><td style="padding:8px 12px;background:#f4f6f2;font-size:12px;font-weight:700;color:#6b7568;text-transform:uppercase;letter-spacing:.05em;">Product</td><td style="padding:8px 12px;background:#f4f6f2;font-size:12px;font-weight:700;color:#6b7568;text-transform:uppercase;letter-spacing:.05em;text-align:right;">Quantity</td></tr>
    ${rows}
  </table>`;
}

export function renderQuoteConfirmationEmail(d: QuoteEmailData): { subject: string; html: string; text: string } {
  const subject = `We've received your quote request (${d.reference}) | PuraVida Natural`;
  const html = wrapEmail(`
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f2417;">Thank you, ${esc(d.name)}.</p>
    <p style="margin:0 0 16px;">We've received your request and our team will reply with pricing, MOQ and specifications within <strong>one business day</strong>.</p>
    ${quoteItemRows(d.items, false)}
    ${d.wantsSamples ? `<p style="margin:0 0 12px;">✔ You asked for <strong>samples</strong>; we'll confirm availability in our reply.</p>` : ""}
    ${d.message ? `<p style="margin:0 0 4px;color:#6b7568;font-size:13px;">Your message</p><p style="margin:0 0 16px;white-space:pre-line;">${esc(d.message)}</p>` : ""}
    <p style="margin:16px 0 4px;color:#6b7568;font-size:13px;">Your reference: <strong style="color:#1a2b1e;">${esc(d.reference)}</strong></p>
    <p style="margin:0 0 20px;color:#6b7568;font-size:13px;">Need to add something? Just reply to this email.</p>
    <a href="${absoluteUrl("/products")}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Browse the full catalogue</a>
  `);
  const text = [
    `Thank you, ${d.name}.`,
    "",
    "We've received your quote request and will reply with pricing, MOQ and specifications within one business day.",
    "",
    ...d.items.map((i) => `- ${i.name}: ${i.quantityLabel}${i.grade ? ` (grade: ${i.grade})` : ""}`),
    d.wantsSamples ? "\nYou asked for samples; we'll confirm availability in our reply." : "",
    d.message ? `\nYour message:\n${d.message}` : "",
    "",
    `Reference: ${d.reference}`,
    "Reply to this email to add anything.",
    "",
    `${COMPANY.name} · ${COMPANY.phone} · ${absoluteUrl("/")}`,
  ].join("\n");
  return { subject, html, text };
}

export function renderQuoteNotificationEmail(d: QuoteEmailData): { subject: string; html: string; text: string } {
  const who = d.company ? `${d.name} (${d.company})` : d.name;
  const subject = `New quote request ${d.reference}: ${who}${d.country ? `, ${d.country}` : ""} (${d.items.length} item${d.items.length === 1 ? "" : "s"})`;
  const row = (k: string, v?: string | null) =>
    v ? `<tr><td style="padding:4px 0;color:#6b7568;width:120px;vertical-align:top;">${k}</td><td style="padding:4px 0;">${v}</td></tr>` : "";
  const html = wrapEmail(`
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f2417;">New quote request · ${esc(d.reference)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2;border-radius:8px;padding:16px;margin:0 0 16px;">
      ${row("Name", esc(d.name))}
      ${row("Company", d.company ? esc(d.company) : null)}
      ${row("Email", `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`)}
      ${row("Phone", d.phone ? esc(d.phone) : null)}
      ${row("Country", d.country ? esc(d.country) : null)}
      ${row("Buyer type", d.buyerType ? esc(d.buyerType) : null)}
      ${row("Samples", d.wantsSamples ? "<strong>Yes, requested</strong>" : null)}
      ${row("From page", d.sourcePage ? esc(d.sourcePage) : null)}
    </table>
    ${quoteItemRows(d.items, true)}
    ${d.message ? `<p style="margin:0 0 4px;color:#6b7568;font-size:13px;">Message</p><p style="margin:0 0 16px;white-space:pre-line;">${esc(d.message)}</p>` : ""}
    ${d.adminUrl ? `<a href="${d.adminUrl}" style="display:inline-block;background:#0f2417;color:#ffffff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;">Open in Website Leads</a>` : ""}
    <p style="margin:16px 0 0;color:#6b7568;">Reply to this email to answer the customer directly.</p>
  `);
  const text = [
    `New quote request ${d.reference}`,
    `From: ${who} <${d.email}>`,
    d.phone ? `Phone: ${d.phone}` : "",
    d.country ? `Country: ${d.country}` : "",
    d.buyerType ? `Buyer type: ${d.buyerType}` : "",
    d.wantsSamples ? "Samples: requested" : "",
    "",
    ...d.items.map((i) => `- ${i.name}: ${i.quantityLabel}${i.grade ? ` (grade ${i.grade})` : ""}${!i.matched ? " [not in catalogue]" : ""}`),
    d.message ? `\nMessage:\n${d.message}` : "",
    d.adminUrl ? `\n${d.adminUrl}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
  return { subject, html, text };
}
