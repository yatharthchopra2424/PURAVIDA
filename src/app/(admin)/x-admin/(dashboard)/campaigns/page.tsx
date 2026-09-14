import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { isMailerConfigured } from "@/lib/mailer";

export const metadata = {
  title: "Campaigns — PuraVida Admin",
};

interface CampaignSummary {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  created_by: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-700/40 text-zinc-300",
  sending: "bg-sky-500/15 text-sky-300",
  paused: "bg-amber-500/15 text-amber-300",
  sent: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
};

function percent(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function CampaignsPage() {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("email_campaigns")
    .select(
      "id, name, subject, status, total_count, sent_count, failed_count, opened_count, clicked_count, created_at, created_by"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const campaigns = (data ?? []) as CampaignSummary[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Campaigns</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
            {!isMailerConfigured() && (
              <span className="text-amber-400"> · SMTP not configured</span>
            )}
          </p>
        </div>

        <Link
          href="/x-admin/leads"
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error.message} — run{" "}
          <code className="rounded bg-zinc-800 px-1">scripts/leads/leads-schema.sql</code> in
          Supabase first.
        </div>
      )}

      {campaigns.length === 0 && !error ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
          <Mail className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-400">No campaigns yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            Pick your audience on the Leads page, then choose Email.
          </p>
          <Link
            href="/x-admin/leads"
            className="mt-4 inline-block rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Go to Leads
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Recipients</th>
                <th className="px-4 py-3 text-right font-medium">Sent</th>
                <th className="px-4 py-3 text-right font-medium">Opened</th>
                <th className="px-4 py-3 text-right font-medium">Clicked</th>
                <th className="px-4 py-3 text-right font-medium">Failed</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="transition-colors hover:bg-zinc-800/40">
                  <td className="max-w-[280px] px-4 py-3">
                    <Link href={`/x-admin/campaigns/${campaign.id}`} className="block">
                      <div className="truncate font-medium text-zinc-100 hover:text-emerald-400">
                        {campaign.name}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {campaign.subject}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {campaign.total_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {campaign.sent_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-zinc-300">{campaign.opened_count}</span>
                    <span className="ml-1 text-xs text-zinc-600">
                      {percent(campaign.opened_count, campaign.sent_count)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-zinc-300">{campaign.clicked_count}</span>
                    <span className="ml-1 text-xs text-zinc-600">
                      {percent(campaign.clicked_count, campaign.sent_count)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={campaign.failed_count ? "text-red-400" : "text-zinc-600"}
                    >
                      {campaign.failed_count}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {new Date(campaign.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
