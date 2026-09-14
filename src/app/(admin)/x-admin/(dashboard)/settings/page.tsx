import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { getAdminEmails } from "@/lib/admin-allowlist";
import { getMailerConfig } from "@/lib/mailer";
import { COMPANY } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";
import { checkEmailAuth, domainOf } from "@/lib/email-auth";
import SettingsClient from "./SettingsClient";
import type { SystemStatus } from "./SystemStatusPanel";

export const metadata = {
  title: "Settings — PuraVida Admin",
};

async function getStatus(adminEmail: string): Promise<SystemStatus> {
  const mailer = getMailerConfig();

  // A From: domain that disagrees with the site's own is a genuine spam
  // signal — but only in production. In development SITE_URL is
  // localhost, which is not a sending identity at all, so comparing
  // against it produced a scary and completely false warning on every
  // dev machine. Only a real, non-preview host is worth comparing.
  let domainMismatch: string | null = null;
  let authReport: SystemStatus["mail"]["auth"] = null;

  if (mailer) {
    const fromDomain = domainOf(mailer.fromEmail);

    let siteHost: string | null = null;
    try {
      siteHost = new URL(SITE_URL).host.toLowerCase().replace(/^www\./, "");
    } catch {
      siteHost = null;
    }

    const isLocalOrPreview =
      !siteHost ||
      siteHost.startsWith("localhost") ||
      siteHost.startsWith("127.0.0.1") ||
      siteHost.endsWith(".vercel.app");

    if (fromDomain && siteHost && !isLocalOrPreview) {
      const aligned =
        siteHost === fromDomain ||
        siteHost.endsWith(`.${fromDomain}`) ||
        fromDomain.endsWith(`.${siteHost}`);

      if (!aligned) {
        domainMismatch = `Sending from ${fromDomain} while the site is ${siteHost}. Mailbox providers treat that mismatch as a spam signal — use an address on the site's domain.`;
      }
    }

    // The records that actually decide inbox placement live in DNS,
    // where nothing in a deploy can verify them. Read them for real.
    if (fromDomain) {
      try {
        authReport = await checkEmailAuth(fromDomain);
      } catch {
        authReport = null;
      }
    }
  }

  // The lead tables are created by a SQL file the operator runs by hand,
  // so "table does not exist" is an expected state, not an error.
  let leads: SystemStatus["leads"] = {
    ready: false,
    total: null,
    enriched: null,
    error: null,
  };

  try {
    const supabase = createSupabaseServiceClient();
    const [{ count: total, error }, { count: enriched }] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("ai_status", "done"),
    ]);

    if (error) {
      leads.error = error.message;
    } else {
      leads = { ready: true, total: total ?? 0, enriched: enriched ?? 0, error: null };
    }
  } catch (err) {
    leads.error = err instanceof Error ? err.message : String(err);
  }

  return {
    adminEmail,
    adminAllowlist: getAdminEmails(),
    siteUrl: SITE_URL,
    mail: {
      configured: mailer !== null,
      host: mailer?.host ?? null,
      port: mailer?.port ?? null,
      secure: mailer?.secure ?? false,
      fromEmail: mailer?.fromEmail ?? null,
      fromName: mailer?.fromName ?? null,
      replyTo: mailer?.replyTo ?? null,
      contactInbox: process.env.CONTACT_EMAIL?.trim() || COMPANY.email,
      domainMismatch,
      auth: authReport,
    },
    ai: {
      configured: Boolean(process.env.NVIDIA_API_KEY?.trim()),
      model: process.env.NVIDIA_MODEL?.trim() || "nvidia/nemotron-3-super-120b-a12b",
    },
    dispatcher: { secretSet: Boolean(process.env.CRON_SECRET?.trim()) },
    leads,
  };
}

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const status = await getStatus(user?.email ?? "unknown");

  return <SettingsClient status={status} />;
}
