/**
 * The company email signature, in one place.
 *
 * Transcribed from the signature already in use in Outlook, so mail the
 * app sends is indistinguishable from mail sent by hand. That matters
 * for more than tidiness: a recipient who has had one email from
 * `rk@puravidanaturalindia.com` and then gets a second that signs off
 * differently has a reason to doubt the second one, and so do spam
 * filters scoring sender consistency.
 *
 * Rendered to HTML and plain text from the same source, because a
 * multipart message whose two halves disagree is itself a signal.
 */

import { COMPANY } from "@/lib/constants";

export interface SignatureOptions {
  /** Overrides the default signer, e.g. when someone else sends. */
  senderName?: string;
  /** Adds the "Try our…" product plug. Off for replies and receipts. */
  includePromo?: boolean;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const LINK = "color:#1f6b42;text-decoration:none;";
const MUTED = "color:#6b7568;";

export interface RenderedSignature {
  html: string;
  text: string;
}

export function renderSignature(options: SignatureOptions = {}): RenderedSignature {
  const signer = options.senderName?.trim() || COMPANY.signerName;
  const promo = options.includePromo ?? true;
  const site = COMPANY.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // ── HTML ──────────────────────────────────────────────────
  const promoHtml = promo
    ? `<tr><td style="padding-top:10px;font-size:13px;color:#1f2a21;">
         ${esc(COMPANY.featuredProduct.pitch)}<br/>
         Buy at <a href="${COMPANY.featuredProduct.url}" style="${LINK}">${esc(
           COMPANY.featuredProduct.url.replace(/^https?:\/\//, "")
         )}</a>
       </td></tr>`
    : "";

  const html = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0"
       style="margin-top:22px;font-family:Helvetica,Arial,sans-serif;line-height:1.55;">
  <tr><td style="font-size:14px;color:#1f2a21;padding-bottom:10px;">Best Regards</td></tr>
  <tr><td style="font-size:15px;font-weight:700;color:#0f2417;">${esc(signer)}</td></tr>
  <tr><td style="font-size:14px;font-weight:600;color:#1f2a21;">${esc(COMPANY.legalName)}</td></tr>
  <tr><td style="font-size:13px;color:#46543f;padding-top:4px;">
    <a href="tel:${esc(COMPANY.phone.replace(/[^+\d]/g, ""))}" style="color:#46543f;text-decoration:none;">${esc(COMPANY.phone)}</a><br/>
    <a href="mailto:${esc(COMPANY.email)}" style="${LINK}">${esc(COMPANY.email)}</a><br/>
    <a href="${COMPANY.website}" style="${LINK}">${esc(site)}</a>
  </td></tr>
  ${promoHtml}
  <tr><td style="padding-top:12px;font-size:12px;${MUTED}">
    Please mail us at:<br/>
    ${COMPANY.contactEmails
      .map((e) => `<a href="mailto:${esc(e)}" style="${LINK}">${esc(e)}</a>`)
      .join("<br/>")}
  </td></tr>
  <tr><td style="padding-top:10px;font-size:11px;color:#96a093;">
    ${esc(COMPANY.address)}${COMPANY.gst ? ` &middot; GSTIN ${esc(COMPANY.gst)}` : ""}
  </td></tr>
</table>`.trim();

  // ── Plain text ────────────────────────────────────────────
  const text = [
    "Best Regards",
    "",
    signer,
    COMPANY.legalName,
    COMPANY.phone,
    COMPANY.email,
    COMPANY.website,
    ...(promo
      ? ["", COMPANY.featuredProduct.pitch, `Buy at ${COMPANY.featuredProduct.url}`]
      : []),
    "",
    "Please mail us at:",
    ...COMPANY.contactEmails,
    "",
    COMPANY.address,
    ...(COMPANY.gst ? [`GSTIN ${COMPANY.gst}`] : []),
  ].join("\n");

  return { html, text };
}
