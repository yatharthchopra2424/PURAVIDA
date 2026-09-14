import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { SITE_URL } from "@/lib/site";
import { isAllowedLinkHost } from "@/lib/campaign-render";

/**
 * Click tracking: records the click, then redirects to the real link.
 *
 * The destination is validated before redirecting. Without that check
 * this route is an open redirect wearing the company's domain, which
 * is exactly the primitive a phisher wants — `puravidanaturalindia.com/
 * api/t/c/...?u=https://evil.example` would look legitimate in a
 * browser's status bar.
 */
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;
  const target = new URL(req.url).searchParams.get("u");

  const fallback = NextResponse.redirect(SITE_URL, 302);
  if (!target) return fallback;

  let destination: URL;
  try {
    destination = new URL(target);
  } catch {
    return fallback;
  }

  if (destination.protocol !== "https:" && destination.protocol !== "http:") {
    return fallback;
  }

  // Same allowlist the renderer used when it decided whether to wrap
  // this link, so a tracked URL always has somewhere legitimate to go.
  if (!isAllowedLinkHost(destination.host)) {
    console.warn(`[track/click] blocked redirect to ${destination.host}`);
    return fallback;
  }

  const redirect = NextResponse.redirect(destination.toString(), 302);

  if (!UUID_RE.test(trackingId)) return redirect;

  try {
    const supabase = createSupabaseServiceClient();

    const { data: send } = await supabase
      .from("email_sends")
      .select("id, campaign_id, click_count, first_clicked_at, first_opened_at, status")
      .eq("tracking_id", trackingId)
      .single();

    const row = send as {
      id: string;
      campaign_id: string;
      click_count: number;
      first_clicked_at: string | null;
      first_opened_at: string | null;
      status: string;
    } | null;

    if (row && row.status === "sent") {
      const now = new Date().toISOString();
      const isFirst = row.first_clicked_at === null;

      await supabase
        .from("email_sends")
        .update({
          click_count: row.click_count + 1,
          first_clicked_at: row.first_clicked_at ?? now,
          // A click is a stronger open signal than the pixel, which ad
          // blockers and text-only clients suppress — so a click with no
          // recorded open backfills the open too.
          first_opened_at: row.first_opened_at ?? now,
        })
        .eq("id", row.id);

      await supabase.from("email_events").insert({
        send_id: row.id,
        campaign_id: row.campaign_id,
        type: "click",
        url: destination.toString().slice(0, 1000),
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      });

      if (isFirst) {
        await supabase.rpc("increment_campaign_clicks", { campaign: row.campaign_id });
      }
    }
  } catch {
    // Never block the redirect on a tracking failure.
  }

  return redirect;
}
