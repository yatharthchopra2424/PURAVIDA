import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

/**
 * Open-tracking pixel.
 *
 * Always returns the image, whatever happens behind it: a tracking
 * failure must never show a broken-image icon in a prospect's inbox.
 * Recording is best-effort and deliberately not awaited past the write.
 */
export const dynamic = "force-dynamic";

// 1×1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixelResponse() {
  return new NextResponse(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      // Without this, Gmail's image proxy caches the pixel and only the
      // first open is ever recorded.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "Content-Length": String(PIXEL.length),
    },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  if (!UUID_RE.test(trackingId)) return pixelResponse();

  try {
    const supabase = createSupabaseServiceClient();

    const { data: send } = await supabase
      .from("email_sends")
      .select("id, campaign_id, open_count, first_opened_at, status")
      .eq("tracking_id", trackingId)
      .single();

    const row = send as {
      id: string;
      campaign_id: string;
      open_count: number;
      first_opened_at: string | null;
      status: string;
    } | null;

    // A queued row cannot have been opened; that request is a scanner.
    if (row && row.status === "sent") {
      const now = new Date().toISOString();
      const isFirst = row.first_opened_at === null;

      await supabase
        .from("email_sends")
        .update({
          open_count: row.open_count + 1,
          first_opened_at: row.first_opened_at ?? now,
        })
        .eq("id", row.id);

      await supabase.from("email_events").insert({
        send_id: row.id,
        campaign_id: row.campaign_id,
        type: "open",
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      });

      // The campaign counter tracks unique openers, not raw opens —
      // "37 of 200 opened" is the number worth reading.
      if (isFirst) {
        await supabase.rpc("increment_campaign_opens", { campaign: row.campaign_id });
      }
    }
  } catch {
    // Swallowed on purpose: analytics must never break the image.
  }

  return pixelResponse();
}
