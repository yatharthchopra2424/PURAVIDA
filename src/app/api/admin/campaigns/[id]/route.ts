import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { isMailerConfigured } from "@/lib/mailer";
import { attachSourceFiles } from "@/lib/campaign-recipients";

const CAMPAIGN_COLUMNS =
  "id, name, subject, body_html, from_name, from_email, reply_to, status, batch_size, " +
  "total_count, sent_count, failed_count, opened_count, clicked_count, " +
  "created_by, created_at, started_at, completed_at, identity";

const CampaignPatchSchema = z.object({
  action: z.enum(["start", "pause", "resume"]).optional(),
  batchSize: z.number().int().min(1).max(200).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const recipientStatus = searchParams.get("recipientStatus");
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") ?? "100", 10) || 100, 1),
    500
  );

  const supabase = createSupabaseServiceClient();

  const { data: campaign, error } = await supabase
    .from("email_campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  let recipientQuery = supabase
    .from("email_sends")
    .select(
      "id, lead_id, to_email, to_name, status, error, sent_at, open_count, " +
        "first_opened_at, click_count, first_clicked_at, unsubscribed_at",
      { count: "exact" }
    )
    .eq("campaign_id", id)
    // Most recently acted-on first; queued rows fall to the bottom.
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (recipientStatus && recipientStatus !== "all") {
    recipientQuery = recipientQuery.eq("status", recipientStatus);
  }

  interface RecipientRow {
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
  }

  const { data: recipientsRaw, count } = await recipientQuery;
  const recipients = (recipientsRaw ?? []) as unknown as RecipientRow[];

  // Which raw file each recipient's lead came from — shown for failed
  // sends specifically, so a bounce or rejection points straight back
  // at the spreadsheet/doc to go re-check rather than leaving "why did
  // this one fail" as a guess.
  const recipientsWithSource = await attachSourceFiles(supabase, recipients);

  // The denormalised counters on the campaign can lag a dispatcher run;
  // the report reads the real per-status split so the numbers on screen
  // are never a stale summary of what actually happened.
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

  return NextResponse.json({
    data: campaign,
    recipients: recipientsWithSource,
    recipientTotal: count ?? 0,
    breakdown,
    mailerConfigured: isMailerConfigured(
      ((campaign as { identity?: string }).identity as "domestic" | "export" | undefined) ?? "domestic"
    ),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CampaignPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const patch: Record<string, unknown> = {};

  if (parsed.data.batchSize) patch.batch_size = parsed.data.batchSize;

  if (parsed.data.action === "pause") {
    patch.status = "paused";
  } else if (parsed.data.action === "start" || parsed.data.action === "resume") {
    const { data: existing } = await supabase
      .from("email_campaigns")
      .select("identity")
      .eq("id", id)
      .single();
    const identity =
      ((existing as { identity?: string } | null)?.identity as "domestic" | "export" | undefined) ??
      "domestic";

    if (!isMailerConfigured(identity)) {
      return NextResponse.json(
        {
          error:
            identity === "export"
              ? "Export SMTP is not configured — nothing would send."
              : "SMTP is not configured — nothing would send.",
        },
        { status: 400 }
      );
    }
    patch.status = "sending";
    patch.started_at = new Date().toISOString();
    patch.completed_at = null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("email_campaigns")
    .update(patch)
    .eq("id", id)
    .select(CAMPAIGN_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  // Deleting a campaign that already sent would destroy the only record
  // of who was contacted. Pausing is the right move there.
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("sent_count")
    .eq("id", id)
    .single();

  if ((campaign as { sent_count: number } | null)?.sent_count) {
    return NextResponse.json(
      { error: "This campaign has already sent mail and cannot be deleted." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("email_campaigns").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
