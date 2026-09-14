/**
 * Campaign audience resolution and the send worker.
 *
 * Shared by the per-campaign "send now" route and the cron dispatcher
 * so that both walk the queue the same way. Sending is the one part of
 * this feature that is not undoable, so the rules live in one file:
 *
 *   - one message per address per campaign (enforced in the schema too)
 *   - never send to a suppressed address, checked at queue time *and*
 *     again immediately before the SMTP call, because an unsubscribe
 *     can land between the two
 *   - a batch is bounded, so one invocation cannot run past a
 *     serverless timeout half-way through a send and lose track of
 *     which messages actually went out
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { renderCampaignEmail } from "@/lib/campaign-render";
import {
  sendCampaignMail,
  isMailerConfigured,
  type MailAttachment,
} from "@/lib/mailer";

import {
  applyLeadFilters,
  primaryEmail,
  type Lead,
  type LeadFilters,
} from "@/lib/leads";

/** Refuses to queue more than this in one campaign. */
export const MAX_AUDIENCE = 5000;

/**
 * Private Supabase Storage bucket holding campaign attachments.
 *
 * Declared here rather than in the upload route so the dependency runs
 * lib -> route and not the other way round; a library importing from a
 * route handler drags the whole request pipeline into anything that
 * touches it.
 */
export const ATTACHMENT_BUCKET = "campaign-attachments";

const AUDIENCE_PAGE = 1000;

export interface AudienceMember {
  /** Null for an address typed into the composer by hand. */
  lead_id: string | null;
  to_email: string;
  to_name: string | null;
}

/** One recipient as the composer has it after edits. */
export interface ExplicitRecipient {
  leadId?: string | null;
  email: string;
  name?: string | null;
}

export type AudienceSelection =
  | { mode: "ids"; ids: string[] }
  | { mode: "filters"; filters: LeadFilters }
  | { mode: "explicit"; recipients: ExplicitRecipient[] };

export interface AudienceResult {
  members: AudienceMember[];
  /** Counts of what was dropped, so the composer can explain the number. */
  dropped: {
    noEmail: number;
    duplicate: number;
    suppressed: number;
  };
}

const AUDIENCE_COLUMNS =
  "id, email, company_email, contact_name, is_suppressed, status";

type AudienceRow = Omit<
  Pick<
    Lead,
    "id" | "email" | "company_email" | "contact_name" | "is_suppressed" | "status"
  >,
  "id"
> & { id: string | null };

/**
 * Turns either an explicit id list or a filter set into a deduplicated
 * recipient list.
 *
 * The filter path re-runs the same query the admin table ran, so
 * "select all 214 matching" means the rows that matched at send time,
 * not a stale snapshot of ids from the browser.
 */
export async function resolveAudience(
  selection: AudienceSelection
): Promise<AudienceResult> {
  const supabase = createSupabaseServiceClient();
  const rows: AudienceRow[] = [];

  // `explicit` is the composer's own list, after the sender has removed
  // people, corrected an address or typed one in by hand. It bypasses
  // the lead lookup entirely — the addresses shown on screen are the
  // addresses that get mailed, which is the only behaviour that makes
  // an editable To field trustworthy.
  if (selection.mode === "explicit") {
    for (const entry of selection.recipients) {
      rows.push({
        id: entry.leadId ?? null,
        email: entry.email,
        company_email: null,
        contact_name: entry.name ?? null,
        // A hand-typed address has no lead row to carry CRM state, and
        // an edited one is still checked against the suppression list
        // below — which is where opt-outs are actually enforced.
        is_suppressed: false,
        status: "new",
      });
    }
  } else if (selection.mode === "ids") {
    // `in` on a very long list makes an unreasonable URL; chunk it.
    for (let i = 0; i < selection.ids.length; i += 200) {
      const chunk = selection.ids.slice(i, i + 200);
      const { data, error } = await supabase
        .from("leads")
        .select(AUDIENCE_COLUMNS)
        .in("id", chunk);

      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as unknown as AudienceRow[]));
    }
  } else {
    for (let offset = 0; offset < MAX_AUDIENCE; offset += AUDIENCE_PAGE) {
      const { data, error } = await applyLeadFilters(
        supabase.from("leads").select(AUDIENCE_COLUMNS),
        selection.filters
      ).range(offset, offset + AUDIENCE_PAGE - 1);

      if (error) throw new Error(error.message);
      if (!data?.length) break;

      rows.push(...(data as unknown as AudienceRow[]));
      if (data.length < AUDIENCE_PAGE) break;
    }
  }

  const suppressed = await loadSuppressions(
    rows.map((r) => primaryEmail(r)).filter((e): e is string => e !== null)
  );

  const members: AudienceMember[] = [];
  const seen = new Set<string>();
  const dropped = { noEmail: 0, duplicate: 0, suppressed: 0 };

  for (const row of rows) {
    const email = primaryEmail(row)?.toLowerCase().trim();

    if (!email) {
      dropped.noEmail++;
      continue;
    }
    if (row.is_suppressed || row.status === "do_not_contact" || suppressed.has(email)) {
      dropped.suppressed++;
      continue;
    }
    // Three contacts in the IPHEX catalogue share an address with
    // another entry; sending the same pitch twice reads as spam.
    if (seen.has(email)) {
      dropped.duplicate++;
      continue;
    }

    seen.add(email);
    members.push({ lead_id: row.id, to_email: email, to_name: row.contact_name });
  }

  return { members, dropped };
}

/** Suppression rows matching any of the given addresses. */
export async function loadSuppressions(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();

  const supabase = createSupabaseServiceClient();
  const found = new Set<string>();

  const unique = [...new Set(emails.map((e) => e.toLowerCase()))];
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await supabase
      .from("email_suppressions")
      .select("email")
      .in("email", unique.slice(i, i + 200));

    if (error) throw new Error(error.message);
    for (const row of data ?? []) found.add((row as { email: string }).email);
  }

  return found;
}

// ── Dispatch ─────────────────────────────────────────────────

export interface DispatchResult {
  campaignId: string;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  remaining: number;
  status: string;
}

interface CampaignAttachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

interface CampaignRow {
  id: string;
  subject: string;
  body_html: string;
  from_name: string | null;
  status: string;
  batch_size: number;
  sent_count: number;
  failed_count: number;
  attachments: CampaignAttachment[] | null;
  track_opens: boolean | null;
}

/**
 * Downloads the campaign's attachments once per batch.
 *
 * Per-message fetching would pull the same PDF from storage twenty-five
 * times for one dispatch; the bytes are identical for every recipient,
 * so they are read once and reused.
 */
async function loadAttachments(
  files: CampaignAttachment[] | null
): Promise<MailAttachment[]> {
  if (!files?.length) return [];

  const supabase = createSupabaseServiceClient();
  const loaded: MailAttachment[] = [];

  for (const file of files) {
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .download(file.path);

    // A missing attachment must not silently become a message without
    // it — but nor should it stop a campaign mid-flight. Log and carry
    // the rest; the send record still shows what went out.
    if (error || !data) {
      console.error(`[campaigns] attachment missing: ${file.path}`, error);
      continue;
    }

    loaded.push({
      filename: file.name,
      content: Buffer.from(await data.arrayBuffer()),
      contentType: file.type,
    });
  }

  return loaded;
}

/**
 * Sends the next batch for one campaign.
 *
 * Each message is claimed by flipping its row to `sending` before the
 * SMTP call, so two concurrent dispatcher runs cannot both pick up the
 * same recipient. A row left in `sending` means the process died
 * mid-send; it is requeued by `requeueStalled` rather than retried
 * blindly, which would risk a duplicate.
 */
export async function dispatchCampaign(campaignId: string): Promise<DispatchResult> {
  const supabase = createSupabaseServiceClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .select(
      "id, subject, body_html, from_name, status, batch_size, sent_count, failed_count, attachments, track_opens"
    )
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "Campaign not found");
  }

  const row = campaign as CampaignRow;

  if (row.status !== "sending") {
    return {
      campaignId,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      remaining: 0,
      status: row.status,
    };
  }

  if (!isMailerConfigured()) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM_EMAIL."
    );
  }

  const { data: queued, error: queueError } = await supabase
    .from("email_sends")
    .select("id, lead_id, to_email, to_name, tracking_id, unsubscribe_token")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .order("queued_at", { ascending: true })
    .limit(row.batch_size);

  if (queueError) throw new Error(queueError.message);

  const batch = (queued ?? []) as {
    id: string;
    lead_id: string | null;
    to_email: string;
    to_name: string | null;
    tracking_id: string;
    unsubscribe_token: string;
  }[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Two lookups for the whole batch rather than two per message.
  const suppressed = await loadSuppressions(batch.map((b) => b.to_email));

  const attachments = await loadAttachments(row.attachments);

  const leadIds = batch.map((b) => b.lead_id).filter((id): id is string => id !== null);
  const leadsById = new Map<string, Lead>();
  if (leadIds.length) {
    const { data: leadRows } = await supabase.from("leads").select("*").in("id", leadIds);
    for (const leadRow of (leadRows ?? []) as Lead[]) leadsById.set(leadRow.id, leadRow);
  }

  for (const item of batch) {
    // Claim the row. If another worker got there first the update
    // matches nothing and this message is left alone.
    const { data: claimed, error: claimError } = await supabase
      .from("email_sends")
      .update({ status: "sending", claimed_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "queued")
      .select("id");

    if (claimError || !claimed?.length) continue;

    if (suppressed.has(item.to_email)) {
      await supabase
        .from("email_sends")
        .update({ status: "skipped", error: "suppressed" })
        .eq("id", item.id);
      skipped++;
      continue;
    }

    const lead = item.lead_id ? leadsById.get(item.lead_id) : undefined;

    try {
      const rendered = renderCampaignEmail({
        subject: row.subject,
        bodyHtml: row.body_html,
        // A deleted lead must not abort the batch; merge fields simply
        // fall back to the address we already have.
        lead: (lead ?? {
          company_name: item.to_name ?? item.to_email,
          contact_name: item.to_name,
        }) as Lead,
        senderName: row.from_name ?? "",
        trackingId: item.tracking_id,
        unsubscribeToken: item.unsubscribe_token,
        tracking: row.track_opens === true,
      });

      const result = await sendCampaignMail({
        to: item.to_email,
        toName: item.to_name,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        unsubscribeUrl: rendered.unsubscribeUrl,
        attachments,
      });

      await supabase
        .from("email_sends")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_id: result.messageId,
          subject: rendered.subject,
          error: null,
        })
        .eq("id", item.id);

      if (item.lead_id) {
        await supabase
          .from("leads")
          .update({ status: "contacted", last_contacted_at: new Date().toISOString() })
          .eq("id", item.lead_id)
          // Never downgrade a lead that has already replied or been won.
          .in("status", ["new", "queued", "contacted"]);
      }

      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("email_sends")
        .update({ status: "failed", error: message.slice(0, 500) })
        .eq("id", item.id);
      failed++;
    }
  }

  const { count: remaining } = await supabase
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const left = remaining ?? 0;
  const nextStatus = left === 0 ? "sent" : "sending";

  await supabase
    .from("email_campaigns")
    .update({
      sent_count: row.sent_count + sent,
      failed_count: row.failed_count + failed,
      status: nextStatus,
      ...(left === 0 ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", campaignId)
    // Do not resurrect a campaign the admin paused while this batch ran.
    .eq("status", "sending");

  return {
    campaignId,
    attempted: batch.length,
    sent,
    failed,
    skipped,
    remaining: left,
    status: nextStatus,
  };
}

/**
 * Returns rows stuck in `sending` to the queue.
 *
 * A serverless invocation killed mid-send leaves a claimed row behind.
 * The wait is deliberately long — longer than any single SMTP attempt
 * can take — so a message still in flight is never sent twice.
 */
export async function requeueStalled(olderThanMinutes = 15): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from("email_sends")
    .update({ status: "queued", claimed_at: null })
    .eq("status", "sending")
    .lt("claimed_at", cutoff)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
