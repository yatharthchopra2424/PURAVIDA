"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { EmailAuthReport } from "@/lib/email-auth";

/**
 * Live configuration readout.
 *
 * Replaces a hardcoded "System Info" block that listed a framework
 * version by hand and had drifted a major release out of date. Every
 * value here is read from the running environment, so the panel can
 * only be wrong if the app itself is.
 *
 * The point is diagnostic: each of these settings fails silently in a
 * different place — a missing SMTP password shows up as a contact form
 * that never emails, a missing CRON_SECRET as a campaign that stops the
 * moment the tab closes. Seeing them in one list is faster than
 * inferring them from symptoms.
 */

interface MailIdentityStatus {
  configured: boolean;
  host: string | null;
  port: number | null;
  secure: boolean;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  contactInbox: string;
  /** Set when the From: domain differs from the site's own domain. */
  domainMismatch: string | null;
  /** Live SPF/DKIM/DMARC lookup for the sending domain. */
  auth: EmailAuthReport | null;
}

export interface SystemStatus {
  adminEmail: string;
  adminAllowlist: string[];
  siteUrl: string;
  mail: MailIdentityStatus;
  /** The exports@ mailbox — a second, independent SMTP identity for international leads. */
  exportMail: MailIdentityStatus;
  ai: { configured: boolean; model: string; keyCount: number };
  dispatcher: { secretSet: boolean };
  leads: {
    ready: boolean;
    total: number | null;
    enriched: number | null;
    error: string | null;
  };
}

type Tone = "ok" | "warn" | "bad";

function StatusRow({
  tone,
  label,
  value,
  hint,
}: {
  tone: Tone;
  label: string;
  value: string;
  hint?: string;
}) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : XCircle;
  const color =
    tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex items-start gap-3 border-b border-zinc-800/70 py-2.5 last:border-0">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm text-zinc-300">{label}</span>
          <span className="break-all text-xs text-zinc-500">{value}</span>
        </div>
        {hint && <p className="mt-0.5 text-xs text-amber-400/80">{hint}</p>}
      </div>
    </div>
  );
}

export default function SystemStatusPanel({ status }: { status: SystemStatus }) {
  const [identity, setIdentity] = useState<"domestic" | "export">("domestic");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    help?: string | null;
  } | null>(null);

  async function runTest(send: boolean) {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mail-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send, identity }),
      });
      const json = await res.json();
      setResult({
        ok: res.ok && json.data?.ok,
        message: json.data?.ok
          ? send
            ? `Test email sent to ${status.adminEmail}.`
            : "Connected — host reachable and credentials accepted."
          : (json.data?.error ?? json.error ?? "Test failed"),
        help: json.data?.help ?? null,
      });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

  const { ai, dispatcher, leads } = status;
  const mail = identity === "export" ? status.exportMail : status.mail;

  return (
    <div className="space-y-4">
      {/* Email */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
            <Mail className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Email</h2>
            <p className="text-xs text-zinc-500">
              Two mailboxes: rk@ for domestic (India) leads, exports@ for
              international ones — campaigns pick one per send
            </p>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-zinc-700 text-xs font-medium">
            {(["domestic", "export"] as const).map((id) => (
              <button
                key={id}
                onClick={() => {
                  setIdentity(id);
                  setResult(null);
                }}
                className={`px-2.5 py-1.5 transition-colors ${
                  identity === id
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                }`}
              >
                {id === "domestic" ? "Domestic" : "Export"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <StatusRow
            tone={mail.configured ? "ok" : "bad"}
            label="SMTP connection"
            value={
              mail.configured
                ? `${mail.host}:${mail.port} · ${mail.secure ? "TLS" : "STARTTLS"}`
                : "not configured"
            }
            hint={
              mail.configured
                ? undefined
                : identity === "export"
                  ? "Set SMTP_EXPORT_USER and SMTP_EXPORT_PASS. Nothing sends from exports@ until then."
                  : "Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM_EMAIL. Nothing sends until then."
            }
          />
          <StatusRow
            tone={mail.configured ? (mail.domainMismatch ? "warn" : "ok") : "bad"}
            label="Sends as"
            value={mail.fromEmail ? `${mail.fromName} <${mail.fromEmail}>` : "—"}
            hint={mail.domainMismatch ?? undefined}
          />
          <StatusRow
            tone="ok"
            label="Enquiries go to"
            value={mail.contactInbox}
          />
          <StatusRow
            tone="ok"
            label="Replies go to"
            value={mail.replyTo ?? "the From address"}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runTest(false)}
            disabled={testing || !mail.configured}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Test connection
          </button>
          <button
            onClick={() => runTest(true)}
            disabled={testing || !mail.configured}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send me a test
          </button>
        </div>

        {result && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              result.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            <p>{result.message}</p>
            {/* An SMTP error code on its own tells the reader nothing;
                the fix for it is the part worth showing. */}
            {result.help && (
              <p className="mt-1.5 leading-relaxed text-red-200/80">{result.help}</p>
            )}
          </div>
        )}
      </div>

      {/* Domain authentication — the part that decides inbox vs spam,
          and the only part that lives outside this codebase. */}
      {mail.auth && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Domain authentication
              </h2>
              <p className="text-xs text-zinc-500">
                Live DNS lookup for{" "}
                <span className="text-zinc-400">{mail.auth.domain}</span> — this
                is what decides inbox versus spam
              </p>
            </div>
          </div>

          {mail.auth.records.map((record) => (
            <div
              key={record.name}
              className="border-b border-zinc-800/70 py-3 last:border-0"
            >
              <div className="flex items-start gap-3">
                {record.state === "pass" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                ) : record.state === "warn" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-zinc-200">
                      {record.name}
                    </span>
                    <span
                      className={`text-xs ${
                        record.state === "pass"
                          ? "text-emerald-400"
                          : record.state === "warn"
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {record.state === "pass"
                        ? "configured"
                        : record.state === "warn"
                          ? "needs attention"
                          : "missing"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                    {record.detail}
                  </p>
                  {record.value && (
                    <code className="mt-1.5 block overflow-x-auto whitespace-pre rounded-lg bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-400">
                      {record.value}
                    </code>
                  )}
                </div>
              </div>
            </div>
          ))}

          <p className="mt-3 text-xs text-zinc-600">
            DNS is cached; a change can take up to an hour to show here. For a
            definitive check, send a message to mail-tester.com and read the
            score.
          </p>
        </div>
      )}

      {/* Everything else */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-1 text-sm font-semibold text-white">Configuration</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Read from the running environment. Values set locally do not reach
          production — set them in Vercel too.
        </p>

        <StatusRow
          tone="ok"
          label="Signed in as"
          value={status.adminEmail}
        />
        <StatusRow
          tone={status.adminAllowlist.length > 0 ? "ok" : "bad"}
          label="Admin allowlist"
          value={
            status.adminAllowlist.length
              ? status.adminAllowlist.join(", ")
              : "empty — everyone is denied"
          }
          hint={
            status.adminAllowlist.length
              ? undefined
              : "ADMIN_EMAILS is empty, so this panel is unreachable after your session expires."
          }
        />
        <StatusRow tone="ok" label="Site URL" value={status.siteUrl} />
        <StatusRow
          tone={leads.ready ? "ok" : "warn"}
          label="Lead database"
          value={
            leads.ready
              ? `${leads.total?.toLocaleString() ?? 0} leads · ${leads.enriched?.toLocaleString() ?? 0} enriched`
              : "not set up"
          }
          hint={
            leads.ready
              ? undefined
              : (leads.error ??
                "Run scripts/leads/leads-schema.sql in Supabase, then npm run leads:extract && leads:import.")
          }
        />
        <StatusRow
          tone={ai.configured ? "ok" : "warn"}
          label="AI enrichment"
          value={
            ai.configured
              ? `${ai.model} · ${ai.keyCount} key${ai.keyCount === 1 ? "" : "s"} (${ai.keyCount}× throughput)`
              : "no API key"
          }
          hint={
            ai.configured
              ? undefined
              : "NVIDIA_API_KEY is only needed to run npm run leads:enrich, not at request time."
          }
        />
        <StatusRow
          tone={dispatcher.secretSet ? "ok" : "warn"}
          label="Campaign dispatcher"
          value={dispatcher.secretSet ? "scheduled sending enabled" : "CRON_SECRET not set"}
          hint={
            dispatcher.secretSet
              ? undefined
              : "Campaigns will only send while a campaign page is open in the browser."
          }
        />
      </div>
    </div>
  );
}
