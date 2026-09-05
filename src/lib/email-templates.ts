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
