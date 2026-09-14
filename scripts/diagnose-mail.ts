/**
 * diagnose-mail.ts — find the SMTP settings that actually authenticate.
 *
 *   npm run mail:diagnose
 *
 * `535 Authentication Failed` is the least informative error in SMTP.
 * It means the server rejected the credentials, but not *why*, and the
 * three usual causes need completely different fixes:
 *
 *   - the password is wrong, or was mangled on its way out of .env;
 *   - the password is right but SMTP relay is switched off on the
 *     mailbox, or two-step verification is on and an app password is
 *     required instead;
 *   - the password is right but the host is wrong, because the mailbox
 *     is really on Microsoft 365 behind a GoDaddy-branded IMAP name.
 *
 * Guessing between those costs an afternoon. This tries the whole
 * matrix of plausible host/port/TLS combinations with the configured
 * credentials and reports which, if any, the server accepts — and
 * inspects the stored password for the whitespace and quoting damage
 * that .env files routinely inflict, without ever printing it.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import nodemailer from "nodemailer";
import { loadEnv } from "./leads/_env";

interface Candidate {
  host: string;
  port: number;
  secure: boolean;
  note: string;
}

function candidatesFor(configuredHost: string): Candidate[] {
  const list: Candidate[] = [];

  // Whatever is configured goes first — if it works, nothing else needs
  // to be tried.
  const configuredPort = Number.parseInt(process.env.SMTP_PORT ?? "465", 10);
  list.push({
    host: configuredHost,
    port: Number.isFinite(configuredPort) ? configuredPort : 465,
    secure: process.env.SMTP_SECURE === "true",
    note: "your current settings",
  });

  // GoDaddy's own mail platform accepts several ports; some networks and
  // some plans only permit a subset.
  for (const [port, secure] of [
    [465, true],
    [587, false],
    [3535, false],
    [80, false],
  ] as const) {
    list.push({
      host: "smtpout.secureserver.net",
      port,
      secure,
      note: "GoDaddy relay",
    });
  }

  // A GoDaddy-sold Microsoft 365 mailbox keeps secureserver.net IMAP
  // names but will only authenticate SMTP against Microsoft's host.
  list.push({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    note: "if the mailbox is really Microsoft 365",
  });

  // De-duplicate, preserving order.
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = `${c.host}:${c.port}:${c.secure}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Looks for the ways a .env file silently corrupts a password, and
 * reports them by shape only. The value itself is never logged.
 */
function inspectStoredPassword(): string[] {
  const problems: string[] = [];

  let rawLine: string | null = null;
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    const found = fs
      .readFileSync(full, "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith("SMTP_PASS="));
    if (found) {
      rawLine = found.replace(/\r$/, "");
      break;
    }
  }

  if (!rawLine) return ["SMTP_PASS is not present in .env.local or .env."];

  const raw = rawLine.slice(rawLine.indexOf("=") + 1);

  if (raw.length === 0) return ["SMTP_PASS is empty."];

  if (/^["']|["']$/.test(raw)) {
    problems.push(
      "The value is wrapped in quotes. They are stripped on load, so a password that genuinely starts or ends with a quote would be read wrong."
    );
  }
  if (raw !== raw.trim()) {
    problems.push(
      "There is leading or trailing whitespace on the line. It is trimmed on load — if the real password ends in a space, it will never authenticate from here."
    );
  }
  // The one that actually bites. Next.js runs .env files through
  // dotenv-expand, so an unescaped `$` is read as a variable reference
  // and substituted away — the app then authenticates with a shorter
  // password than the one on disk, while this CLI (which does not
  // expand) sees the real thing and reports success. Two tools, one
  // file, two different passwords.
  const unescapedDollar = /(^|[^\\])\$/.test(raw);
  if (unescapedDollar) {
    problems.push(
      "The value contains an UNESCAPED '$'. Next.js expands $NAME as a variable, " +
        "so the app receives a truncated password and fails with 535 while this " +
        "CLI succeeds. Escape it as \\$ — quoting does NOT help, because dotenv " +
        "strips quotes before expansion runs."
    );
  }

  if (raw.includes("#")) {
    problems.push(
      "The value contains a '#'. Some .env parsers treat it as a comment and truncate there."
    );
  }
  if (/[^ -~]/.test(raw)) {
    problems.push(
      "The value contains a non-ASCII or control character. Retype it by hand rather than pasting."
    );
  }

  return problems;
}

async function tryCandidate(
  candidate: Candidate,
  user: string,
  pass: string
): Promise<{ ok: boolean; error?: string }> {
  const transport = nodemailer.createTransport({
    host: candidate.host,
    port: candidate.port,
    secure: candidate.secure,
    auth: { user, pass },
    connectionTimeout: 12_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
    tls: { rejectUnauthorized: true },
  });

  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    transport.close();
  }
}

function shorten(message: string): string {
  const first = message.split("\n")[0].trim();
  return first.length > 90 ? `${first.slice(0, 87)}...` : first;
}

async function main() {
  loadEnv();

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST?.trim() || "smtpout.secureserver.net";

  if (!user || !pass) {
    console.error("\n  SMTP_USER and SMTP_PASS must both be set in .env.local.\n");
    process.exit(1);
  }

  console.log(`\n  Username   ${user}`);
  console.log(`  Password   ${pass.length} characters stored\n`);

  const problems = inspectStoredPassword();
  if (problems.length) {
    console.log("  Possible problems with how the password is stored:");
    for (const p of problems) console.log(`    - ${p}`);
    console.log("");
  }

  const candidates = candidatesFor(host);
  console.log(`  Trying ${candidates.length} host/port combinations...\n`);

  const working: Candidate[] = [];
  let sawAuthFailure = false;

  for (const candidate of candidates) {
    const label = `${candidate.host}:${candidate.port} ${
      candidate.secure ? "SSL " : "STARTTLS"
    }`;
    process.stdout.write(`  ${label.padEnd(44)} `);

    const result = await tryCandidate(candidate, user, pass);

    if (result.ok) {
      console.log(`ACCEPTED  (${candidate.note})`);
      working.push(candidate);
    } else {
      const message = result.error ?? "";
      if (/535|invalid login|authentication failed/i.test(message)) {
        sawAuthFailure = true;
        console.log("rejected credentials");
      } else {
        console.log(`unreachable — ${shorten(message)}`);
      }
    }
  }

  console.log("");

  if (working.length > 0) {
    const best = working[0];
    console.log("  These settings authenticate. Put them in .env.local:\n");
    console.log(`    SMTP_HOST=${best.host}`);
    console.log(`    SMTP_PORT=${best.port}`);
    console.log(`    SMTP_SECURE=${best.secure ? "true" : ""}`);
    console.log(`    SMTP_USER=${user}\n`);
    return;
  }

  // Every combination refused the same credentials, so the host is not
  // the variable — the password or the mailbox's own settings are.
  if (sawAuthFailure) {
    console.log("  Every host rejected these credentials, so the password is the problem,");
    console.log("  not the server settings. In order of likelihood:\n");
    console.log("   1. The password is not the one this mailbox uses for SMTP.");
    console.log("      Outlook may be holding a saved/older password, or using OAuth,");
    console.log("      in which case what you typed there is not what it authenticates with.");
    console.log("      Reset it: GoDaddy -> Email & Office -> Manage -> the mailbox ->");
    console.log("      Change password. Use the new one in BOTH Outlook and .env.local.\n");
    console.log("   2. Two-step verification is on for the mailbox. SMTP then needs an");
    console.log("      app password, not the login password.\n");
    console.log("   3. SMTP relay/authentication is disabled on the mailbox. GoDaddy");
    console.log("      disables it on some plans until it is switched on, and a brand new");
    console.log("      mailbox can take up to 24 hours before relay works at all.\n");
    console.log("  Re-run this after each change:  npm run mail:diagnose\n");
    process.exit(1);
  }

  console.log("  No host was reachable at all. That is a network problem rather than a");
  console.log("  credentials one — outbound SMTP is often blocked on office and mobile");
  console.log("  networks. Try another connection, then re-run.\n");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
