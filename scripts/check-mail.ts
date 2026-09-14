/**
 * check-mail.ts — prove the SMTP mailbox works before anything depends on it.
 *
 *   npm run mail:verify
 *   npm run mail:verify -- --to you@example.com     # also send a real test
 *
 * Every email the site sends — quote confirmations, admin notifications
 * and bulk campaigns — goes over one SMTP connection to the company's
 * own mailbox. When that connection is misconfigured the symptoms are
 * indirect and easy to misread: a contact form that silently never
 * emails, or a campaign whose rows all land in `failed`. This checks the
 * connection directly and reports what is actually wrong.
 */

import { loadEnv, parseArgs } from "./leads/_env";
import {
  getMailerConfig,
  verifyTransport,
  sendMail,
  closeTransport,
  smtpErrorHelp as explain,
} from "../src/lib/mailer";

async function main() {
  loadEnv();
  const args = parseArgs();

  const config = getMailerConfig();

  if (!config) {
    console.error("\n  SMTP is not configured.\n");
    console.error("  Set these in .env.local:");
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM_EMAIL"]) {
      console.error(`    ${key}${process.env[key]?.trim() ? "  (set)" : "  MISSING"}`);
    }
    console.error("");
    process.exit(1);
  }

  console.log(`\n  Host       ${config.host}:${config.port}`);
  console.log(`  TLS        ${config.secure ? "implicit (465-style)" : "STARTTLS (587-style)"}`);
  console.log(`  Username   ${config.user}`);
  console.log(`  From       ${config.fromName} <${config.fromEmail}>`);
  console.log(`  Reply-To   ${config.replyTo ?? "(same as From)"}\n`);

  process.stdout.write("  Connecting… ");
  const result = await verifyTransport();

  if (!result.ok) {
    console.log("failed\n");
    console.error(`  ${result.error}\n`);
    const hint = explain(result.error);
    if (hint) console.error(`  ${hint}\n`);
    closeTransport();
    process.exit(1);
  }

  console.log("ok — host reachable and credentials accepted\n");

  const to = typeof args.to === "string" ? args.to : null;

  if (!to) {
    console.log("  Add --to you@example.com to send a real test message.\n");
    closeTransport();
    return;
  }

  process.stdout.write(`  Sending a test to ${to}… `);

  try {
    const { messageId } = await sendMail({
      to,
      subject: "SMTP test — PuraVida",
      html: `<p>This is a test from the PuraVida mail layer.</p>
             <p>Sent via <strong>${config.host}</strong> as ${config.fromEmail}.</p>`,
      text: `This is a test from the PuraVida mail layer.\nSent via ${config.host} as ${config.fromEmail}.`,
    });
    console.log("sent");
    console.log(`  Message-ID ${messageId}\n`);
    console.log("  If it lands in spam, the domain still needs SPF, DKIM and DMARC.");
    console.log("  Check the score at https://www.mail-tester.com before sending outreach.\n");
  } catch (err) {
    console.log("failed\n");
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ${message}\n`);
    const hint = explain(message);
    if (hint) console.error(`  ${hint}\n`);
    closeTransport();
    process.exit(1);
  }

  closeTransport();
}

main().catch((err) => {
  console.error(err);
  closeTransport();
  process.exit(1);
});
