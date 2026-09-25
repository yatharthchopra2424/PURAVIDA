import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { isMailerConfigured } from "@/lib/mailer";
import { attachSourceFiles } from "@/lib/campaign-recipients";
import CampaignReportClient, { type Campaign, type Recipient } from "./CampaignReportClient";

export const metadata = {
  title: "Campaign — PuraVida Admin",
};

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select(
      "id, name, subject, body_html, from_name, from_email, reply_to, status, batch_size, " +
        "total_count, sent_count, failed_count, opened_count, clicked_count, " +
        "created_by, created_at, started_at, completed_at, identity"
    )
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  const { data: recipientsRaw } = await supabase
    .from("email_sends")
    .select(
      "id, lead_id, to_email, to_name, status, error, sent_at, open_count, " +
        "first_opened_at, click_count, first_clicked_at, unsubscribed_at"
    )
    .eq("campaign_id", id)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const recipients = await attachSourceFiles(
    supabase,
    (recipientsRaw ?? []) as unknown as { lead_id: string | null }[]
  );

  // The campaign's own counters can lag a dispatcher run, so the report
  // is built from the real per-status split of the send rows.
  const { data: statusRows } = await supabase
    .from("email_sends")
    .select("status")
    .eq("campaign_id", id)
    .limit(10_000);

  const breakdown = (statusRows ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = (row as { status: string }).status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <CampaignReportClient
      initialCampaign={campaign as unknown as Campaign}
      initialRecipients={(recipients ?? []) as unknown as Recipient[]}
      initialBreakdown={breakdown}
      mailerConfigured={isMailerConfigured(
        ((campaign as { identity?: string }).identity as "domestic" | "export" | undefined) ?? "domestic"
      )}
    />
  );
}
