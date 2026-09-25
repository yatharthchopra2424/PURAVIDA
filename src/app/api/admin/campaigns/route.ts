import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { getMailerConfig } from "@/lib/mailer";
import { parseLeadFilters } from "@/lib/leads";
import { sanitizeEmailHtml } from "@/lib/campaign-render";
import { resolveAudience, MAX_AUDIENCE } from "@/lib/campaigns";

const SEND_CHUNK = 250;

const CampaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(200_000),
  senderName: z.string().trim().max(120).optional(),
  replyTo: z.email().max(200).optional().or(z.literal("")),
  /** Which mailbox this sends from: rk@ for domestic leads, exports@ for international ones. */
  identity: z.enum(["domestic", "export"]).default("domestic"),
  batchSize: z.number().int().min(1).max(200).optional(),
  /** Open pixel + click rewriting. Costs inbox placement; default off. */
  trackOpens: z.boolean().optional(),
  /** Manifest from /api/admin/campaigns/attachments, not raw files. */
  attachments: z
    .array(
      z.object({
        name: z.string().max(120),
        path: z.string().max(300),
        size: z.number().int().nonnegative(),
        type: z.string().max(120),
      })
    )
    .max(5)
    .optional(),
  /**
   * How the audience was chosen:
   *   filters  — re-resolved at send time, so late opt-outs are honoured
   *   ids      — a fixed set of leads
   *   explicit — the composer's own list, after edits and manual adds
   */
  audience: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("ids"), ids: z.array(z.uuid()).min(1).max(MAX_AUDIENCE) }),
    z.object({ mode: z.literal("filters"), query: z.string().max(2000) }),
    z.object({
      mode: z.literal("explicit"),
      recipients: z
        .array(
          z.object({
            leadId: z.uuid().nullable().optional(),
            email: z.email().max(200),
            name: z.string().max(160).nullable().optional(),
          })
        )
        .min(1)
        .max(MAX_AUDIENCE),
    }),
  ]),
  /** false queues the recipients and leaves the campaign as a draft. */
  startNow: z.boolean().default(false),
});

export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
    100
  );

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("email_campaigns")
    .select(
      "id, name, subject, status, batch_size, total_count, sent_count, failed_count, " +
        "opened_count, clicked_count, created_by, created_at, started_at, completed_at, identity"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CampaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const mailer = getMailerConfig(input.identity);

  // Refuse to queue a campaign that can never be sent — otherwise the
  // failure surfaces later as hundreds of failed rows.
  if (input.startNow && !mailer) {
    return NextResponse.json(
      {
        error:
          input.identity === "export"
            ? "Export SMTP is not configured. Set SMTP_EXPORT_USER and SMTP_EXPORT_PASS, then try again."
            : "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM_EMAIL, then try again.",
      },
      { status: 400 }
    );
  }

  const audience = await resolveAudience(
    input.audience.mode === "filters"
      ? {
          mode: "filters",
          filters: parseLeadFilters(new URLSearchParams(input.audience.query)),
        }
      : input.audience
  );

  if (audience.members.length === 0) {
    return NextResponse.json(
      {
        error: "No contactable recipients matched that selection.",
        dropped: audience.dropped,
      },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const senderName = input.senderName?.trim() || mailer?.fromName || "";

  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .insert({
      name: input.name,
      subject: input.subject,
      // Sanitised on the way in, so a stored campaign can never hold
      // markup the send path would have to strip again later.
      body_html: sanitizeEmailHtml(input.bodyHtml),
      from_name: senderName,
      from_email: mailer?.fromEmail ?? null,
      reply_to: input.replyTo || mailer?.replyTo || null,
      identity: input.identity,
      batch_size: input.batchSize ?? 8,
      attachments: input.attachments ?? [],
      track_opens: input.trackOpens ?? false,
      total_count: audience.members.length,
      status: input.startNow ? "sending" : "draft",
      started_at: input.startNow ? new Date().toISOString() : null,
      created_by: auth.user.email ?? null,
    })
    .select("id, status")
    .single();

  if (campaignError || !campaign) {
    // A column added after the schema was first run is the one failure
    // here that has an obvious fix, so name it instead of surfacing the
    // raw Postgres error.
    const staleSchema = /column .* does not exist/i.test(campaignError?.message ?? "");
    return NextResponse.json(
      {
        error: staleSchema
          ? `${campaignError?.message}. Re-run scripts/leads/leads-schema.sql in the Supabase SQL editor — it is safe to run again and adds the columns introduced since your database was created.`
          : (campaignError?.message ?? "Could not create campaign"),
      },
      { status: 500 }
    );
  }

  const campaignId = (campaign as { id: string }).id;

  for (let i = 0; i < audience.members.length; i += SEND_CHUNK) {
    const chunk = audience.members.slice(i, i + SEND_CHUNK).map((member) => ({
      campaign_id: campaignId,
      lead_id: member.lead_id,
      to_email: member.to_email,
      to_name: member.to_name,
      subject: input.subject,
    }));

    const { error: sendsError } = await supabase.from("email_sends").insert(chunk);

    if (sendsError) {
      // A half-queued campaign would send to an arbitrary subset, which
      // is worse than none: drop it and let the admin retry.
      await supabase.from("email_campaigns").delete().eq("id", campaignId);
      return NextResponse.json(
        { error: `Could not queue recipients: ${sendsError.message}` },
        { status: 500 }
      );
    }
  }

  // Mark the leads so the table shows what is already in flight.
  // Hand-typed recipients have no lead row to mark.
  const leadIds = audience.members
    .map((m) => m.lead_id)
    .filter((id): id is string => id !== null);
  for (let i = 0; i < leadIds.length; i += SEND_CHUNK) {
    await supabase
      .from("leads")
      .update({ status: "queued" })
      .in("id", leadIds.slice(i, i + SEND_CHUNK))
      .eq("status", "new");
  }

  return NextResponse.json({
    data: {
      id: campaignId,
      status: (campaign as { status: string }).status,
      queued: audience.members.length,
      dropped: audience.dropped,
    },
  });
}
