/**
 * Live DNS check of the sending domain's email authentication.
 *
 * SPF, DKIM and DMARC are the three records that decide whether cold
 * outreach reaches an inbox or a spam folder, and all three live
 * outside the codebase — in DNS, where nothing in the app can verify
 * them. A deploy can be perfect and every message still be filtered
 * because a registrar edit was never made.
 *
 * So the admin panel reads them directly rather than describing what
 * they should be.
 */

import { promises as dns } from "node:dns";

export type RecordState = "pass" | "warn" | "fail" | "unknown";

export interface AuthRecord {
  name: string;
  state: RecordState;
  value: string | null;
  detail: string;
}

export interface EmailAuthReport {
  domain: string;
  records: AuthRecord[];
  checkedAt: string;
}

/**
 * DKIM lives at `<selector>._domainkey.<domain>`, and the selector is
 * chosen by the mail provider — there is no way to enumerate it from
 * DNS. These are the selectors the common providers use, so a hit
 * confirms DKIM is live; a miss only means "not found at a name we
 * know", which is reported honestly rather than as a failure.
 */
const DKIM_SELECTORS = [
  // GoDaddy / Secureserver
  "default",
  "email",
  "dkim",
  // Google Workspace
  "google",
  // Microsoft 365
  "selector1",
  "selector2",
  // Zoho
  "zoho",
  "zmail",
  // Generic / common
  "s1",
  "s2",
  "k1",
  "mail",
  "smtp",
];

/**
 * Which mail platform the domain actually uses, read from MX.
 *
 * This decides whether a missing DKIM record is a thing to go and fix
 * or a thing that cannot be fixed at all: GoDaddy's own email platform
 * does not publish DKIM keys for customer domains, so no amount of DNS
 * editing will produce one. Saying "not found" without that context
 * sends someone hunting for a setting that does not exist.
 */
async function detectPlatform(domain: string): Promise<{
  id: "godaddy" | "microsoft" | "google" | "zoho" | "other" | "unknown";
  label: string;
}> {
  try {
    const mx = (await dns.resolveMx(domain)).sort((a, b) => a.priority - b.priority);
    const hosts = mx.map((r) => r.exchange.toLowerCase()).join(" ");

    if (hosts.includes("secureserver.net"))
      return { id: "godaddy", label: "GoDaddy Professional Email" };
    if (hosts.includes("outlook.com") || hosts.includes("protection.outlook"))
      return { id: "microsoft", label: "Microsoft 365" };
    if (hosts.includes("google.com") || hosts.includes("googlemail"))
      return { id: "google", label: "Google Workspace" };
    if (hosts.includes("zoho")) return { id: "zoho", label: "Zoho Mail" };
    if (hosts) return { id: "other", label: mx[0]?.exchange ?? "another provider" };
  } catch {
    // No MX, or the lookup failed.
  }
  return { id: "unknown", label: "an unknown provider" };
}

async function txt(name: string): Promise<string[]> {
  try {
    // Each TXT record can be split into several strings by the DNS
    // layer; joining them is what reconstitutes a long SPF or DKIM key.
    const records = await dns.resolveTxt(name);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

async function checkSpf(domain: string): Promise<AuthRecord> {
  const records = (await txt(domain)).filter((r) =>
    r.toLowerCase().startsWith("v=spf1")
  );

  if (records.length === 0) {
    return {
      name: "SPF",
      state: "fail",
      value: null,
      detail:
        "No SPF record. Receiving servers cannot confirm this domain authorised the send, and most will filter it.",
    };
  }

  // More than one SPF record is a spec violation, and the usual result
  // is that receivers treat the domain as having none at all.
  if (records.length > 1) {
    return {
      name: "SPF",
      state: "fail",
      value: records.join("  |  "),
      detail:
        "Two SPF records exist. RFC 7208 permits exactly one — receivers treat this as a permanent error. Merge them into a single record.",
    };
  }

  const value = records[0];
  const strict = /[-~]all\s*$/.test(value.trim());

  return {
    name: "SPF",
    state: strict ? "pass" : "warn",
    value,
    detail: strict
      ? "Authorised senders are declared and everything else is rejected."
      : "The record does not end in -all or ~all, so it does not actually tell receivers to reject anyone else.",
  };
}

async function checkDmarc(domain: string): Promise<AuthRecord> {
  const records = (await txt(`_dmarc.${domain}`)).filter((r) =>
    r.toLowerCase().startsWith("v=dmarc1")
  );

  if (records.length === 0) {
    return {
      name: "DMARC",
      state: "fail",
      value: null,
      detail:
        "No DMARC record. Gmail and Yahoo now require one from anyone sending in volume.",
    };
  }

  const value = records[0];
  const policy = value.match(/\bp=(none|quarantine|reject)\b/i)?.[1]?.toLowerCase();

  if (policy === "none") {
    return {
      name: "DMARC",
      state: "warn",
      value,
      detail:
        "Policy is p=none — monitoring only, nothing is enforced. Fine while you check the reports; move to p=quarantine once they look clean.",
    };
  }

  return {
    name: "DMARC",
    state: "pass",
    value,
    detail:
      policy === "reject"
        ? "Policy is p=reject — the strictest setting. Anything failing authentication is refused outright, including any spoof of this domain."
        : "Policy is p=quarantine — mail failing authentication goes to spam. Note this applies to your own mail too, so From: must stay on this domain.",
  };
}

async function checkDkim(domain: string): Promise<AuthRecord> {
  const platform = await detectPlatform(domain);
  const found: string[] = [];

  await Promise.all(
    DKIM_SELECTORS.map(async (selector) => {
      const records = await txt(`${selector}._domainkey.${domain}`);
      if (records.some((r) => /v=DKIM1|p=[A-Za-z0-9+/]/.test(r))) {
        found.push(selector);
      }
      // A CNAME-delegated selector (Microsoft, some GoDaddy plans)
      // resolves rather than returning TXT, and still means DKIM is on.
      if (records.length === 0) {
        try {
          await dns.resolveCname(`${selector}._domainkey.${domain}`);
          found.push(selector);
        } catch {
          // Not present under this selector.
        }
      }
    })
  );

  if (found.length === 0) {
    // Not every "missing" DKIM is actionable. Say which kind this is.
    const detail =
      platform.id === "godaddy"
        ? "Your MX records point at GoDaddy Professional Email, which does not publish DKIM keys for customer domains — there is no setting to switch on, so this cannot be fixed in DNS. Mail still passes DMARC on SPF alignment alone, which is why delivery works. To gain DKIM you would have to move the mailbox to a platform that offers it, such as Microsoft 365 (which GoDaddy also sells)."
        : platform.id === "microsoft"
          ? "Microsoft 365 publishes DKIM as two CNAMEs at selector1._domainkey and selector2._domainkey. Enable it in the Microsoft 365 Defender portal under Email & collaboration → Policies → DKIM, then add the CNAMEs it shows you."
          : platform.id === "google"
            ? "Google Workspace generates a DKIM key under Apps → Google Workspace → Gmail → Authenticate email. Generate it, publish the TXT record it gives you, then press Start authentication."
            : `Not found under any common selector. It may be published under a name specific to ${platform.label}. Send a message to mail-tester.com to confirm either way.`;

    return {
      name: "DKIM",
      state: "warn",
      value: `mail platform: ${platform.label}`,
      detail,
    };
  }

  return {
    name: "DKIM",
    state: "pass",
    value: `selector: ${[...new Set(found)].join(", ")}`,
    detail:
      "A signing key is published. Messages carry a signature that survives forwarding, which SPF alone does not.",
  };
}

/** Runs all three lookups. Never throws — a DNS failure is a result. */
export async function checkEmailAuth(domain: string): Promise<EmailAuthReport> {
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
  ]);

  return {
    domain,
    records: [spf, dkim, dmarc],
    checkedAt: new Date().toISOString(),
  };
}

/** The domain part of an email address, lower-cased. */
export function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  return email.slice(at + 1).trim().toLowerCase() || null;
}
