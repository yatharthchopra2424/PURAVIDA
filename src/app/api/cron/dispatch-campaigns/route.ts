import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { dispatchCampaign, requeueStalled } from "@/lib/campaigns";
import { closeTransport, isMailerConfigured } from "@/lib/mailer";

/**
 * The automation worker: every campaign in `sending` gets one batch
 * per invocation.
 *
 * Called on a schedule (Vercel Cron, or the existing GitHub Actions
 * workflow) so a campaign keeps sending after the admin closes the tab.
 * Batch size is per campaign, which is how the send rate is kept below
 * whatever the SMTP provider allows.
 *
 * Authenticated with CRON_SECRET rather than an admin session, because
 * the caller is a machine. Without that secret set, the route refuses
 * to run at all — an open dispatch endpoint would let anyone on the
 * internet drain a queued campaign.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Timing-safe-ish comparison; avoids leaking the secret's length. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function handle(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set; dispatcher disabled." },
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization");
  const provided = header?.startsWith("Bearer ")
    ? header.slice(7)
    : new URL(req.url).searchParams.get("secret");

  if (!secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMailerConfigured()) {
    return NextResponse.json(
      { error: "SMTP is not configured; nothing dispatched." },
      { status: 503 }
    );
  }

  const supabase = createSupabaseServiceClient();

  try {
    const requeued = await requeueStalled();

    const { data: active, error } = await supabase
      .from("email_campaigns")
      .select("id")
      .eq("status", "sending")
      .order("started_at", { ascending: true })
      // More than a few concurrent campaigns would blow the invocation
      // budget; the rest are picked up on the next tick.
      .limit(3);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = [];
    for (const campaign of active ?? []) {
      const id = (campaign as { id: string }).id;
      try {
        results.push(await dispatchCampaign(id));
      } catch (err) {
        results.push({
          campaignId: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ requeued, campaigns: results });
  } finally {
    closeTransport();
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
