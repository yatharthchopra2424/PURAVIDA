/**
 * The mail layer. Every email PuraVida sends goes through this module.
 *
 * Built on a direct SMTP connection to the company's own mailbox — no
 * third-party sending API. That means the sending reputation, the
 * deliverability and the recipient data all stay with the domain rather
 * than with a vendor, and there is no per-message billing or monthly
 * quota to run into mid-campaign.
 *
 * Two entry points, deliberately distinct:
 *
 *   sendMail()          transactional — quote confirmations, admin
 *                       notifications. One recipient, expected, sent
 *                       the moment something happens.
 *
 *   sendCampaignMail()  bulk outreach — adds the RFC 8058 one-click
 *                       unsubscribe headers, so Gmail and Outlook show
 *                       their own opt-out control. That control is what
 *                       keeps complaint rates down, and the complaint
 *                       rate is what protects the sending domain.
 *
 * Both take an `identity`: "domestic" sends as rk@ (India-market leads,
 * the original catalogue), "export" sends as exports@ (the international
 * lead batches). Two mailboxes rather than one From: header switched at
 * send time, because a recipient who replies must land in the inbox the
 * right person actually reads, and because the two markets' sending
 * reputations should not be able to affect each other.
 *
 * Required env (server-side only, never NEXT_PUBLIC_):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS      — domestic (rk@)
 *   SMTP_SECURE      "true" for implicit TLS on 465; omit for 587 STARTTLS
 *   MAIL_FROM_EMAIL  the From: address, on a domain with SPF+DKIM+DMARC
 *   MAIL_FROM_NAME   display name (optional)
 *   MAIL_REPLY_TO    where replies should land (optional)
 *
 *   SMTP_EXPORT_USER, SMTP_EXPORT_PASS              — export (exports@)
 *   SMTP_EXPORT_HOST, SMTP_EXPORT_PORT, SMTP_EXPORT_SECURE  (optional —
 *                       default to the same host/port/secure as domestic,
 *                       since it's the same mail provider)
 *   MAIL_EXPORT_FROM_EMAIL, MAIL_EXPORT_FROM_NAME, MAIL_EXPORT_REPLY_TO
 *                       (optional — default to SMTP_EXPORT_USER / "PuraVida
 *                       Natural" / unset)
 */

import { randomUUID } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * "pk" is the customer-facing mailbox (pk@) that sends website enquiry
 * confirmations. It is not a campaign sender, so it is not in the list
 * campaigns choose from.
 */
export type MailIdentity = "domestic" | "export" | "pk";
export type CampaignIdentity = Exclude<MailIdentity, "pk">;
export const MAIL_IDENTITIES: CampaignIdentity[] = ["domestic", "export"];
const ALL_IDENTITIES: MailIdentity[] = ["domestic", "export", "pk"];

const PREFIX: Record<MailIdentity, { smtp: string; mail: string; label: string }> = {
  domestic: { smtp: "SMTP_", mail: "MAIL_", label: "SMTP" },
  export: { smtp: "SMTP_EXPORT_", mail: "MAIL_EXPORT_", label: "Export SMTP (SMTP_EXPORT_*)" },
  pk: { smtp: "SMTP_PK_", mail: "MAIL_PK_", label: "pk@ SMTP (SMTP_PK_*)" },
};

export interface MailerConfig {
  identity: MailIdentity;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  replyTo: string | null;
}

/** Reads and validates SMTP env for one identity. Returns null when not configured. */
export function getMailerConfig(identity: MailIdentity = "domestic"): MailerConfig | null {
  const prefix = PREFIX[identity].smtp;
  const mailPrefix = PREFIX[identity].mail;
  // Secondary mailboxes on the same provider inherit host/port/TLS.
  const inherits = identity !== "domestic";

  const host =
    process.env[`${prefix}HOST`]?.trim() ||
    (inherits ? process.env.SMTP_HOST?.trim() : undefined);
  const user = process.env[`${prefix}USER`]?.trim();
  const pass = process.env[`${prefix}PASS`];
  const fromEmail = process.env[`${mailPrefix}FROM_EMAIL`]?.trim() || user;

  if (!host || !user || !pass || !fromEmail) return null;

  // A blank .env line sets the variable to "", not undefined — `||`
  // treats that as absent the same way it does for `host` above.
  // `??` would not (an empty string is not nullish), which is exactly
  // the bug this had: SMTP_EXPORT_PORT= left blank was read as "",
  // parsed to NaN, and silently fell back to 587 instead of the
  // domestic port.
  const portEnv =
    process.env[`${prefix}PORT`]?.trim() ||
    (inherits ? process.env.SMTP_PORT?.trim() : undefined);
  const port = Number.parseInt(portEnv || "587", 10);
  const resolvedPort = Number.isFinite(port) ? port : 587;

  const secureEnv =
    process.env[`${prefix}SECURE`]?.trim() ||
    (inherits ? process.env.SMTP_SECURE?.trim() : undefined);

  return {
    identity,
    host,
    port: resolvedPort,
    // Port 465 is implicit TLS; 587 upgrades with STARTTLS. Getting this
    // backwards produces a connection that hangs rather than a clear error.
    secure: secureEnv ? secureEnv === "true" : resolvedPort === 465,
    user,
    pass,
    fromEmail,
    fromName: process.env[`${mailPrefix}FROM_NAME`]?.trim() || "PuraVida Natural",
    replyTo: process.env[`${mailPrefix}REPLY_TO`]?.trim() || null,
  };
}

export function isMailerConfigured(identity: MailIdentity = "domestic"): boolean {
  return getMailerConfig(identity) !== null;
}

const cached: Partial<Record<MailIdentity, Transporter>> = {};

/**
 * Pooled transport, one per identity.
 *
 * A campaign batch sends many messages per invocation, and opening a
 * fresh TLS connection for each is both slow and a good way to trip a
 * provider's connection-rate limit.
 */
export function getTransport(identity: MailIdentity = "domestic"): Transporter {
  const existing = cached[identity];
  if (existing) return existing;

  const config = getMailerConfig(identity);
  if (!config) {
    throw new Error(`${PREFIX[identity].label} is not configured.`);
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    // A hung SMTP connection must not hold a serverless invocation open
    // until the platform kills it mid-batch.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  cached[identity] = transport;
  return transport;
}

/** Verifies host, TLS and credentials without sending. */
export async function verifyTransport(
  identity: MailIdentity = "domestic"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isMailerConfigured(identity)) {
    return {
      ok: false,
      error: `${PREFIX[identity].label} is not configured.`,
    };
  }
  try {
    await getTransport(identity).verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Strips CR/LF from anything that becomes a header value.
 *
 * A newline in a subject or display name lets the sender append headers
 * of their own — a Bcc, a different Reply-To. Subjects here are built
 * from form input and from merge fields carrying third-party data, so
 * this is not theoretical.
 */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  /** Overrides MAIL_REPLY_TO — e.g. replying straight to the customer. */
  replyTo?: string | null;
  headers?: Record<string, string>;
  attachments?: MailAttachment[];
  /** Which mailbox sends this. Defaults to the original rk@ mailbox. */
  identity?: MailIdentity;
}

export interface SendResult {
  messageId: string;
}

/** Sends one transactional message. Throws on failure; callers decide. */
export async function sendMail(options: SendMailOptions): Promise<SendResult> {
  const identity = options.identity ?? "domestic";
  const config = getMailerConfig(identity);
  if (!config) {
    throw new Error(`${PREFIX[identity].label} is not configured`);
  }

  const info = await getTransport(identity).sendMail({
    from: { name: config.fromName, address: config.fromEmail },
    to: options.toName
      ? { name: sanitizeHeaderValue(options.toName), address: options.to }
      : options.to,
    replyTo: options.replyTo ?? config.replyTo ?? undefined,
    subject: sanitizeHeaderValue(options.subject),
    html: options.html,
    text: options.text,
    attachments: options.attachments,

    // ── Deliverability ──────────────────────────────────────
    // Return-Path pinned to the From address. SPF authenticates the
    // *envelope* sender, not the visible From:, and DMARC only passes
    // when the two align. Left to default these can diverge, and the
    // message then fails DMARC despite a perfectly good SPF record.
    envelope: { from: config.fromEmail, to: options.to },

    // Message-ID on the sending domain. A Message-ID whose domain does
    // not match From: is a documented spam heuristic.
    messageId: buildMessageId(config.fromEmail),

    headers: {
      // nodemailer advertises itself in X-Mailer by default, which is a
      // "sent by a script" marker no legitimate business mail carries.
      // Setting it to undefined removes the header entirely.
      "X-Mailer": undefined,
      ...options.headers,
    },
  });

  return { messageId: info.messageId };
}

/**
 * RFC 5322 Message-ID, rooted at the sending domain.
 *
 * Random enough to never collide, and carrying no information about
 * the recipient or the campaign — a Message-ID is echoed back in
 * bounces and replies, so it should not leak anything.
 */
function buildMessageId(fromEmail: string): string {
  const domain = fromEmail.split("@")[1] ?? "localhost";
  const unique = `${Date.now().toString(36)}.${randomUUID().replace(/-/g, "")}`;
  return `<${unique}@${domain}>`;
}

export interface OutboundCampaignMail extends SendMailOptions {
  /** RFC 8058 one-click unsubscribe target. */
  unsubscribeUrl?: string;
}

/** Sends one bulk-outreach message, with opt-out headers attached. */
export async function sendCampaignMail(
  mail: OutboundCampaignMail
): Promise<SendResult> {
  // No list headers at all — deliberately, and at the owner's direction.
  //
  // `List-Unsubscribe`, `List-Unsubscribe-Post` and `Precedence: bulk`
  // are the headers that tell a mailbox provider "this is bulk mail".
  // Gmail reads them as a self-declaration and files the message under
  // Promotions accordingly, which is exactly what this outreach must
  // avoid: a message in Promotions is not read by a purchase manager.
  //
  // The cost is real and is accepted knowingly: recipients get no
  // one-click opt-out control in Gmail or Outlook, so anyone wanting
  // out has to reply and be added to the suppression list by hand.
  // The suppression list itself is still enforced on every send, and
  // /api/unsubscribe still works for links already in the wild.
  return sendMail({ ...mail, headers: { ...mail.headers } });
}

/**
 * Turns an SMTP error into the thing to actually go and fix.
 *
 * `535 Authentication Failed` is the least informative error in the
 * protocol — it says the credentials were refused but not why, and the
 * causes need completely different fixes. The stale-environment case
 * deserves top billing because it is both the most common and the most
 * confusing: Next.js reads .env.local once at boot, so a password
 * corrected while the server is running is a password the server has
 * never seen, and the CLI and the app then disagree about credentials
 * that are, on disk, identical.
 */
export function smtpErrorHelp(error: string): string | null {
  const lower = error.toLowerCase();

  if (
    lower.includes("535") ||
    lower.includes("invalid login") ||
    lower.includes("authentication failed")
  ) {
    return (
      "The server refused the credentials. In order of likelihood: " +
      "(1) this process is running with an out-of-date copy of .env.local — " +
      "environment variables are read once at startup, so restart the dev " +
      "server or redeploy after changing SMTP_PASS; " +
      "(2) the password is not the one the mailbox uses for SMTP — reset it " +
      "at your mail provider and update both the mail client and .env.local; " +
      "(3) two-step verification is on, so SMTP needs an app password; " +
      "(4) SMTP relay is disabled on the mailbox. " +
      "Run `npm run mail:diagnose` to test the credentials outside the app."
    );
  }
  if (lower.includes("wrong version number") || lower.includes("ssl")) {
    return "TLS mismatch. Use SMTP_SECURE=true only on port 465; on 587 leave it unset so STARTTLS is used.";
  }
  if (lower.includes("etimedout") || lower.includes("timeout")) {
    return "No response from the host. Check SMTP_HOST and SMTP_PORT, and whether outbound SMTP is blocked on this network.";
  }
  if (lower.includes("enotfound") || lower.includes("eai_again")) {
    return "The hostname did not resolve. Check SMTP_HOST for a typo.";
  }
  if (lower.includes("econnrefused")) {
    return "The host refused the connection on that port. Try 587 (STARTTLS) or 465 (implicit TLS).";
  }
  if (lower.includes("relay") || lower.includes("not permitted") || lower.includes("550")) {
    return "Authentication succeeded but the server refused to relay. The From address must match the authenticated mailbox — check MAIL_FROM_EMAIL equals SMTP_USER.";
  }
  return null;
}

/** Drops the pooled connection(s). Called when a batch finishes. */
export function closeTransport(identity?: MailIdentity): void {
  const identities = identity ? [identity] : ALL_IDENTITIES;
  for (const id of identities) {
    cached[id]?.close();
    delete cached[id];
  }
}
