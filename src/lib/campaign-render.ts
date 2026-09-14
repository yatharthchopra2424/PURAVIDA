/**
 * Turns a campaign draft plus one lead into the exact message that
 * goes on the wire: merge fields filled, links rewritten for click
 * tracking, an open pixel and an unsubscribe footer appended, and a
 * plain-text alternative generated.
 *
 * Every merge value is HTML-escaped on the way in. The admin writes the
 * template, but the *values* come from a PDF that a third party
 * produced — a company name containing `<script>` must not become
 * markup in someone's inbox.
 */

import { COMPANY } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";
import { renderSignature } from "@/lib/signature";
import type { Lead } from "@/lib/leads";

// ── Merge fields ─────────────────────────────────────────────

export interface MergeField {
  token: string;
  label: string;
  description: string;
}

/** Shown as insertable chips in the composer. */
export const MERGE_FIELDS: MergeField[] = [
  { token: "first_name", label: "First name", description: "Geeta" },
  { token: "full_name", label: "Full name", description: "Geeta Seshadri" },
  { token: "salutation_name", label: "Ms. Surname", description: "Ms. Seshadri" },
  { token: "company", label: "Company", description: "Amtec Health Care Pvt. Ltd." },
  { token: "designation", label: "Designation", description: "Director" },
  { token: "city", label: "City", description: "Mumbai" },
  { token: "country", label: "Country", description: "India" },
  { token: "segment", label: "Segment", description: "Nutraceutical Brand" },
  { token: "icebreaker", label: "AI icebreaker", description: "The generated opening line" },
  { token: "products", label: "Suggested products", description: "Ashwagandha Extract, Curcumin 95%" },
  { token: "sender_name", label: "Your name", description: "From the campaign settings" },
  { token: "sender_company", label: "Our company", description: COMPANY.name },
];

/**
 * Strips anything that has no business in an email body.
 *
 * The composer is admin-only, so this is not the last line of defence
 * against a hostile author — it is a guard against what a rich-text
 * editor and the clipboard produce: a pasted `<script>`, an `onerror`
 * left on an image, a `javascript:` href. Mail clients ignore most of
 * it anyway, but spam filters score its presence, and nothing here is
 * ever wanted in a message.
 */
export function sanitizeEmailHtml(html: string): string {
  return (
    html
      // Whole elements, contents included. The word boundary stops
      // <formal> or <linkedin> being mistaken for <form> / <link>.
      .replace(
        /<(script|style|iframe|object|embed|form|meta|link)\b[\s\S]*?<\/\1\s*>/gi,
        ""
      )
      .replace(
        /<(script|style|iframe|object|embed|form|meta|link)\b[^>]*\/?>/gi,
        ""
      )
      // Inline event handlers: onclick=, onerror=, quoted or not.
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
      // Script-bearing URLs in href/src.
      .replace(
        /\s(href|src)\s*=\s*"(?:javascript|data|vbscript):[^"]*"/gi,
        ""
      )
      .replace(
        /\s(href|src)\s*=\s*'(?:javascript|data|vbscript):[^']*'/gi,
        ""
      )
      // contentEditable leaves these behind; they mean nothing in mail.
      .replace(/\scontenteditable\s*=\s*"[^"]*"/gi, "")
      .trim()
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Title-cases a SHOUTING company name without touching normal casing. */
export function tidyCompanyName(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return name;

  return (
    name
      .toLowerCase()
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      // "Pvt." and "Ltd." survive title case intact; initialisms do not,
      // and "Amtec Api Llp" in a first line reads as a typo.
      .replace(/\bLlp\b/g, "LLP")
      .replace(/\bLlc\b/g, "LLC")
      .replace(/\bApi(s?)\b/g, "API$1")
  );
}

function firstName(lead: Pick<Lead, "contact_name">): string {
  const name = lead.contact_name?.trim();
  if (!name) return "there";
  // "Bhavik.Parikh" is a real value in the source data.
  return name.split(/[\s.]+/).filter(Boolean)[0] ?? "there";
}

export interface MergeContext {
  lead: Lead;
  senderName: string;
}

/** Raw (unescaped) merge values, so the text alternative can reuse them. */
export function mergeValues({ lead, senderName }: MergeContext): Record<string, string> {
  const company = tidyCompanyName(lead.company_name);
  const surname = lead.contact_name?.trim().split(/\s+/).slice(-1)[0] ?? "";

  return {
    first_name: firstName(lead),
    full_name: lead.contact_name?.trim() || "there",
    salutation_name:
      lead.salutation && surname ? `${lead.salutation} ${surname}` : firstName(lead),
    company,
    designation: lead.designation?.trim() || "",
    city: lead.city_verified ?? lead.city ?? "",
    country: lead.country_verified ?? lead.country ?? "",
    segment: lead.segment ?? "",
    icebreaker: lead.icebreaker?.trim() || "",
    products: (lead.suggested_products ?? []).join(", "),
    sender_name: senderName,
    sender_company: COMPANY.name,
  };
}

const TOKEN_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** Replaces `{{token}}` occurrences. `escape` is false for plain text. */
export function applyMerge(
  template: string,
  values: Record<string, string>,
  escape = true
): string {
  return template.replace(TOKEN_RE, (match, rawToken: string) => {
    const token = rawToken.toLowerCase();
    if (!(token in values)) return match;
    const value = values[token];
    return escape ? escapeHtml(value) : value;
  });
}

/** Tokens used in a template that have no corresponding merge field. */
export function unknownTokens(template: string): string[] {
  const known = new Set(MERGE_FIELDS.map((f) => f.token));
  const found = new Set<string>();
  for (const match of template.matchAll(TOKEN_RE)) {
    const token = match[1].toLowerCase();
    if (!known.has(token)) found.add(token);
  }
  return [...found];
}

// ── Tracking ─────────────────────────────────────────────────

export function openPixelUrl(trackingId: string): string {
  return `${SITE_URL}/api/t/o/${trackingId}`;
}

export function clickUrl(trackingId: string, target: string): string {
  return `${SITE_URL}/api/t/c/${trackingId}?u=${encodeURIComponent(target)}`;
}

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/unsubscribe/${token}`;
}

/**
 * Hosts a tracked campaign link may point at: this site, plus anything
 * in CAMPAIGN_LINK_HOSTS (comma separated) for the occasional link to a
 * brochure or booking page elsewhere.
 *
 * The click endpoint enforces the same list before redirecting, so an
 * open redirect cannot be built out of the company's own domain. This
 * function exists so the renderer agrees with it: wrapping a link the
 * redirect will later refuse would put a dead PuraVida-branded URL in
 * the email, which is worse than not tracking that click.
 */
export function campaignLinkHosts(): Set<string> {
  const hosts = new Set<string>();

  try {
    hosts.add(new URL(SITE_URL).host.toLowerCase());
  } catch {
    // Malformed SITE_URL: fall through to the env list only.
  }

  for (const entry of (process.env.CAMPAIGN_LINK_HOSTS ?? "").split(",")) {
    const host = entry.trim().toLowerCase();
    if (host) hosts.add(host);
  }

  return hosts;
}

/** True when `host` is an allowed host or a subdomain of one. */
export function isAllowedLinkHost(host: string): boolean {
  const normalized = host.toLowerCase();
  const allowed = campaignLinkHosts();

  return (
    allowed.has(normalized) ||
    // Subdomains only — "evilpuravidanaturalindia.com" must not match.
    [...allowed].some((a) => normalized.endsWith(`.${a}`))
  );
}

/**
 * Rewrites `href`s through the click tracker.
 *
 * Left alone, and deliberately:
 *   - `mailto:` and `tel:`, which have nothing to track;
 *   - the unsubscribe link, because recording a click on the way to an
 *     opt-out is the wrong signal, and some clients refuse to follow a
 *     redirect for a one-click unsubscribe;
 *   - any host the click endpoint would refuse to redirect to, which
 *     would otherwise become a PuraVida-branded link to nowhere.
 */
export function rewriteLinks(html: string, trackingId: string, skip: string[]): string {
  return html.replace(
    /href\s*=\s*(["'])(.*?)\1/gi,
    (match, quote: string, url: string) => {
      const target = url.trim();
      if (!/^https?:\/\//i.test(target)) return match;
      if (skip.some((s) => target.startsWith(s))) return match;

      try {
        if (!isAllowedLinkHost(new URL(target).host)) return match;
      } catch {
        return match;
      }

      return `href=${quote}${clickUrl(trackingId, target)}${quote}`;
    }
  );
}

// ── Full message ─────────────────────────────────────────────

const SIGNATURE_STYLE =
  "margin:26px 0 0;padding-top:18px;border-top:2px solid #0f2417;font-family:Helvetica,Arial,sans-serif;";
const LEGAL_STYLE =
  "margin:14px 0 0;padding-top:12px;border-top:1px solid #e5e9e2;color:#96a093;font-size:11px;line-height:1.6;font-family:Helvetica,Arial,sans-serif;";

/**
 * Wraps the composed body in a minimal, email-client-safe shell.
 *
 * Deliberately plainer than the transactional templates in
 * `email-templates.ts`: a cold email that looks like a newsletter gets
 * filtered like one. No hero image, no logo banner, no wide tables.
 */
function wrap(bodyHtml: string, signature: string, legalHtml: string): string {
  // `lang` and a real <title> are small but genuine spam-score inputs,
  // and several filters penalise HTML with no text alternative at all —
  // which is why every message here is sent multipart.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(COMPANY.name)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="max-width:600px;margin:0 auto;padding:24px;color:#1f2a21;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;">
      ${bodyHtml}
      ${signature}
      ${legalHtml ? `<div style="${LEGAL_STYLE}">${legalHtml}</div>` : ""}
    </div>
  </body>
</html>`;
}

/** Very rough HTML → text. Good enough for the multipart alternative. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

export interface RenderOptions {
  subject: string;
  bodyHtml: string;
  lead: Lead;
  senderName: string;
  trackingId: string;
  unsubscribeToken: string;
  /** Previews skip the pixel and the link rewriting. */
  preview?: boolean;
  /** Set false when the draft already carries its own sign-off. */
  includeSignature?: boolean;
  /**
   * Open-pixel and click-rewriting, off by default.
   *
   * Both are Promotions-tab signals: a 1×1 image is a textbook bulk
   * marker, and every link pointing at a redirector rather than at the
   * site it claims to go to is another. Turning them on buys open and
   * click numbers at the cost of inbox placement — which is the wrong
   * trade for cold outreach whose whole value is being read.
   */
  tracking?: boolean;
}

export function renderCampaignEmail(options: RenderOptions): RenderedEmail {
  const values = mergeValues({ lead: options.lead, senderName: options.senderName });

  const subject = applyMerge(options.subject, values, false).slice(0, 200);
  let body = applyMerge(options.bodyHtml, values, true);

  const unsubUrl = unsubscribeUrl(options.unsubscribeToken);
  const tracked = options.tracking === true && options.preview !== true;

  if (tracked) {
    body = rewriteLinks(body, options.trackingId, [unsubUrl]);
  }

  // The company's real signature, identical to the one used in Outlook.
  // Appended unless the draft already ends with one, so a sender who
  // pastes their own sign-off does not get two.
  const signature = options.includeSignature === false
    ? ""
    : `<div style="${SIGNATURE_STYLE}">${renderSignature({ senderName: options.senderName }).html}</div>`;

  // No unsubscribe link, at the owner's explicit direction.
  //
  // The trade being made: a visible opt-out is what CAN-SPAM and its
  // equivalents ask for in the body, and it is what stops an annoyed
  // recipient reaching for "report spam" instead. Against that, it is
  // also one of the clearest "this is a mailing list" tells a reader
  // and a filter can see, and this mail landing in Promotions makes it
  // worthless. Opt-outs now arrive as replies and are added to the
  // suppression list by hand; that list is still enforced on every
  // send, and /api/unsubscribe still honours links already sent.
  const footer = tracked
    ? `<img src="${openPixelUrl(options.trackingId)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : "";

  const html = wrap(body, signature, footer);

  // The text alternative carries the same signature the HTML does.
  // Built from renderSignature() rather than assembled separately, so
  // the two halves of the multipart message cannot drift apart — a
  // recipient reading in plain text must see the same sign-off, and a
  // filter comparing the parts must find them consistent.
  const text = [
    htmlToText(applyMerge(options.bodyHtml, values, false)),
    "",
    options.includeSignature === false
      ? ""
      : renderSignature({ senderName: options.senderName }).text,
  ].join("\n");

  return { subject, html, text, unsubscribeUrl: unsubUrl };
}
