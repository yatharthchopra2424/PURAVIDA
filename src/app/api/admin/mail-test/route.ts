import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  verifyTransport,
  sendMail,
  closeTransport,
  getMailerConfig,
  smtpErrorHelp,
} from "@/lib/mailer";
import { COMPANY } from "@/lib/constants";

/**
 * SMTP health check for the Settings page.
 *
 * `send: false` only opens the connection and authenticates.
 * `send: true` delivers a real message — to the signed-in admin's own
 * address, never to one supplied in the request body. An endpoint that
 * mails an arbitrary address on request is an open relay wearing the
 * company's domain, however well authenticated it is.
 */
export const maxDuration = 30;

const MailTestSchema = z.object({ send: z.boolean().default(false) });

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // An empty body means "just verify" — not worth a 400.
  }

  const parsed = MailTestSchema.safeParse(body);
  const send = parsed.success ? parsed.data.send : false;

  const config = getMailerConfig();
  if (!config) {
    return NextResponse.json({
      data: {
        ok: false,
        error:
          "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM_EMAIL.",
      },
    });
  }

  try {
    const verified = await verifyTransport();
    if (!verified.ok) {
      return NextResponse.json({
        data: { ok: false, error: verified.error, help: smtpErrorHelp(verified.error) },
      });
    }

    if (!send) {
      return NextResponse.json({ data: { ok: true } });
    }

    const to = auth.user.email;
    if (!to) {
      return NextResponse.json({
        data: { ok: false, error: "Your account has no email address to send to." },
      });
    }

    await sendMail({
      to,
      subject: `SMTP test — ${COMPANY.name} admin`,
      html: `<p>Your mail settings work.</p>
             <p>Sent over <strong>${config.host}:${config.port}</strong> as
             ${config.fromName} &lt;${config.fromEmail}&gt;.</p>
             <p>If this landed in spam, the sending domain still needs SPF,
             DKIM and DMARC records.</p>`,
      text:
        `Your mail settings work.\n\n` +
        `Sent over ${config.host}:${config.port} as ${config.fromName} <${config.fromEmail}>.\n\n` +
        `If this landed in spam, the sending domain still needs SPF, DKIM and DMARC records.`,
    });

    return NextResponse.json({ data: { ok: true, sentTo: to } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      data: { ok: false, error: message, help: smtpErrorHelp(message) },
    });
  } finally {
    closeTransport();
  }
}
