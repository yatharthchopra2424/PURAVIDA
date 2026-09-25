"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Loader2,
  RefreshCw,
  AlertTriangle,
  MailCheck,
  Eye,
  MousePointerClick,
  XCircle,
  FileWarning,
  Copy,
  Check,
} from "lucide-react";

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  identity?: "domestic" | "export";
  status: string;
  batch_size: number;
  total_count: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Recipient {
  id: string;
  lead_id: string | null;
  to_email: string;
  to_name: string | null;
  status: string;
  error: string | null;
  sent_at: string | null;
  open_count: number;
  first_opened_at: string | null;
  click_count: number;
  first_clicked_at: string | null;
  unsubscribed_at: string | null;
  /** The lead's raw `source` tag, and the original file name resolved from it (null for the IPHEX catalogue, whose source isn't file-based). */
  source: string | null;
  sourceFile: string | null;
}

const RECIPIENT_STATUS_STYLES: Record<string, string> = {
  queued: "bg-zinc-700/40 text-zinc-400",
  sending: "bg-sky-500/15 text-sky-300",
  sent: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  skipped: "bg-amber-500/15 text-amber-300",
  bounced: "bg-red-500/25 text-red-200",
};

const FILTERS = ["all", "sent", "queued", "failed", "skipped"] as const;

interface Props {
  initialCampaign: Campaign;
  initialRecipients: Recipient[];
  initialBreakdown: Record<string, number>;
  mailerConfigured: boolean;
}

export default function CampaignReportClient({
  initialCampaign,
  initialRecipients,
  initialBreakdown,
  mailerConfigured,
}: Props) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [breakdown, setBreakdown] = useState(initialBreakdown);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatchNote, setDispatchNote] = useState<string | null>(null);

  const refresh = useCallback(
    async (recipientStatus = filter) => {
      try {
        const params = new URLSearchParams({ recipientStatus, limit: "200" });
        const res = await fetch(`/api/admin/campaigns/${campaign.id}?${params}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not refresh");

        setCampaign(json.data as Campaign);
        setRecipients(json.recipients as Recipient[]);
        setBreakdown(json.breakdown ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [campaign.id, filter]
  );

  // Changing the status filter refetches from the click, not from an
  // effect: the fetch is a consequence of the interaction, and running
  // it in an effect would also fire a redundant request on mount over
  // the rows the server already rendered.
  function changeFilter(next: (typeof FILTERS)[number]) {
    setFilter(next);
    refresh(next);
  }

  // While a campaign is sending, drive the dispatcher from this page so
  // the admin can watch it work and stop it. The cron job does the same
  // thing unattended, so closing the tab does not strand the queue.
  const sending = campaign.status === "sending";
  const dispatching = useRef(false);

  useEffect(() => {
    if (!sending || !mailerConfigured) return;

    let cancelled = false;

    async function tick() {
      if (dispatching.current || cancelled) return;
      dispatching.current = true;

      try {
        const res = await fetch(`/api/admin/campaigns/${campaign.id}/dispatch`, {
          method: "POST",
        });
        const json = await res.json();

        if (!cancelled) {
          if (!res.ok) {
            setError(json.error ?? "Dispatch failed");
          } else {
            const result = json.data as {
              sent: number;
              failed: number;
              remaining: number;
            };
            setDispatchNote(
              `Last batch: ${result.sent} sent, ${result.failed} failed, ${result.remaining} left.`
            );
            await refresh();
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        dispatching.current = false;
      }
    }

    tick();
    // A gap between batches keeps the send rate human-looking and stays
    // well inside typical SMTP per-minute limits.
    const timer = setInterval(tick, 20_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sending, mailerConfigured, campaign.id, refresh]);

  async function act(action: "start" | "pause" | "resume") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not update the campaign");
      setCampaign(json.data as Campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const queued = breakdown.queued ?? Math.max(campaign.total_count - campaign.sent_count, 0);
  const openRate = campaign.sent_count
    ? Math.round((campaign.opened_count / campaign.sent_count) * 100)
    : 0;
  const clickRate = campaign.sent_count
    ? Math.round((campaign.clicked_count / campaign.sent_count) * 100)
    : 0;
  const progress = campaign.total_count
    ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_count) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/x-admin/campaigns"
            className="mt-1 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-white">{campaign.name}</h1>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  campaign.identity === "export"
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {campaign.identity === "export" ? "Export" : "Domestic"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-zinc-400">{campaign.subject}</p>
            <p className="mt-1 text-xs text-zinc-600">
              {campaign.from_name} &lt;{campaign.from_email}&gt;
              {campaign.created_by ? ` · created by ${campaign.created_by}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          {campaign.status === "sending" ? (
            <button
              onClick={() => act("pause")}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          ) : campaign.status !== "sent" ? (
            <button
              onClick={() => act(campaign.status === "paused" ? "resume" : "start")}
              disabled={busy || !mailerConfigured || queued === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              <Play className="h-4 w-4" />
              {campaign.status === "paused" ? "Resume" : "Start sending"}
            </button>
          ) : null}
        </div>
      </div>

      {!mailerConfigured && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>SMTP is not configured, so this campaign cannot send.</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress */}
      {campaign.total_count > 0 && campaign.status !== "draft" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-200">
              {sending && (
                <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin text-sky-400" />
              )}
              {campaign.sent_count + campaign.failed_count} of {campaign.total_count} processed
            </span>
            <span className="text-zinc-500">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {dispatchNote && <p className="mt-2 text-xs text-zinc-500">{dispatchNote}</p>}
          {sending && (
            <p className="mt-1 text-xs text-zinc-600">
              Sending {campaign.batch_size} per batch. Leave this page open to keep it
              moving, or let the scheduled dispatcher finish it.
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={MailCheck} label="Delivered" value={campaign.sent_count} tone="emerald" />
        <Stat
          icon={Eye}
          label="Opened"
          value={campaign.opened_count}
          suffix={campaign.sent_count ? `${openRate}%` : undefined}
          tone="sky"
        />
        <Stat
          icon={MousePointerClick}
          label="Clicked"
          value={campaign.clicked_count}
          suffix={campaign.sent_count ? `${clickRate}%` : undefined}
          tone="indigo"
        />
        <Stat icon={XCircle} label="Failed" value={campaign.failed_count} tone="red" />
      </div>

      <p className="text-xs text-zinc-600">
        Open tracking relies on a pixel that many clients block by default, so the real
        open rate is higher than the one shown. Clicks are the reliable signal.
      </p>

      {/* Recipients */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-lg font-semibold text-white">Recipients</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => changeFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {f}
                {f !== "all" && breakdown[f] !== undefined && (
                  <span className="ml-1 text-zinc-500">{breakdown[f]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Opens</th>
                <th className="px-4 py-3 text-right font-medium">Clicks</th>
                <th className="px-4 py-3 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {recipients.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-zinc-800/40">
                  <td className="max-w-[320px] px-4 py-3">
                    <div className="truncate text-zinc-200">{r.to_name ?? r.to_email}</div>
                    {r.to_name && (
                      <div className="truncate text-xs text-zinc-500">{r.to_email}</div>
                    )}
                    {r.error && (
                      <div className="mt-0.5 truncate text-xs text-red-400" title={r.error}>
                        {r.error}
                      </div>
                    )}
                    {(r.status === "failed" || r.status === "bounced") && r.sourceFile && (
                      <SourceFileHint sourceFile={r.sourceFile} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        RECIPIENT_STATUS_STYLES[r.status] ?? RECIPIENT_STATUS_STYLES.queued
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.unsubscribed_at && (
                      <span className="ml-1.5 text-xs text-amber-400">unsubscribed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {r.open_count || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {r.click_count || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {r.sent_at
                      ? new Date(r.sent_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}

              {recipients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No recipients with that status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {recipients.length >= 200 && (
          <p className="text-xs text-zinc-600">
            Showing the first 200. Filter by status to narrow the list.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Shown under a failed/bounced recipient — which raw file its lead came
 * from, and the exact command to re-read just that file after fixing
 * whatever was wrong with the address in it.
 */
function SourceFileHint({ sourceFile }: { sourceFile: string }) {
  const [copied, setCopied] = useState(false);
  const command = `npm run leads:extract-raw -- --file "${sourceFile}"`;

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
      <FileWarning className="h-3 w-3 flex-shrink-0 text-amber-500" />
      <span className="truncate" title={sourceFile}>
        from {sourceFile}
      </span>
      <button
        onClick={copy}
        title={command}
        className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy re-check command"}
      </button>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  tone: "emerald" | "sky" | "indigo" | "red";
}) {
  const tones = {
    emerald: "text-emerald-400",
    sky: "text-sky-400",
    indigo: "text-indigo-400",
    red: "text-red-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Icon className={`h-3.5 w-3.5 ${tones}`} />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value.toLocaleString()}</span>
        {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
}
