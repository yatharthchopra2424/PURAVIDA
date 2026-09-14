import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { COMPANY } from "@/lib/constants";

/**
 * Opt-out endpoint.
 *
 * GET renders a confirmation page; POST performs the unsubscribe. The
 * split matters: corporate mail scanners and link-preview bots fetch
 * every URL in a message with GET, and a one-click GET would
 * unsubscribe recipients who never touched the link.
 *
 * POST also satisfies RFC 8058 one-click unsubscribe, which is what
 * the List-Unsubscribe-Post header advertises, so Gmail's own
 * unsubscribe button works without the recipient seeing this page.
 */
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(title)} — ${esc(COMPANY.name)}</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#f4f6f2; font-family:Helvetica,Arial,sans-serif; color:#1f2a21; padding:24px; }
  .card { background:#fff; border:1px solid #e5e9e2; border-radius:14px; padding:32px;
          max-width:440px; width:100%; }
  h1 { font-size:20px; margin:0 0 12px; }
  p { font-size:15px; line-height:1.6; margin:0 0 16px; color:#46543f; }
  button { background:#0f2417; color:#fff; border:0; border-radius:10px; padding:12px 20px;
           font-size:15px; font-weight:600; cursor:pointer; }
  button:hover { background:#1b3a27; }
  .muted { font-size:12px; color:#8a9487; margin:20px 0 0; }
</style>
</head>
<body><div class="card">${body}</div></body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    }
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    return page("Link not recognised", `<h1>This link is not valid</h1>
      <p>It may have been copied incompletely. You can reply to any of our emails and we will remove you by hand.</p>`, 404);
  }

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("email_sends")
    .select("to_email, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .single();

  const row = data as { to_email: string; unsubscribed_at: string | null } | null;

  if (!row) {
    return page("Link not recognised", `<h1>This link is not valid</h1>
      <p>It may have expired. Reply to any of our emails and we will remove you by hand.</p>`, 404);
  }

  if (row.unsubscribed_at) {
    return page("Already unsubscribed", `<h1>You are unsubscribed</h1>
      <p><strong>${esc(row.to_email)}</strong> will not receive further emails from ${esc(COMPANY.name)}.</p>`);
  }

  return page("Unsubscribe", `<h1>Unsubscribe</h1>
    <p>Stop receiving emails from ${esc(COMPANY.name)} at <strong>${esc(row.to_email)}</strong>?</p>
    <form method="post"><button type="submit">Unsubscribe me</button></form>
    <p class="muted">${esc(COMPANY.name)} &middot; ${esc(COMPANY.address)}</p>`);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    return page("Link not recognised", `<h1>This link is not valid</h1>`, 404);
  }

  const supabase = createSupabaseServiceClient();

  const { data } = await supabase
    .from("email_sends")
    .select("id, campaign_id, lead_id, to_email")
    .eq("unsubscribe_token", token)
    .single();

  const row = data as {
    id: string;
    campaign_id: string;
    lead_id: string | null;
    to_email: string;
  } | null;

  if (!row) {
    return page("Link not recognised", `<h1>This link is not valid</h1>`, 404);
  }

  const now = new Date().toISOString();

  // Suppression is keyed on the address, not the lead, so the same
  // person is protected across every future campaign and every other
  // catalogue row that happens to carry the same address.
  await supabase
    .from("email_suppressions")
    .upsert(
      { email: row.to_email, reason: "unsubscribe", campaign_id: row.campaign_id },
      { onConflict: "email" }
    );

  await supabase
    .from("email_sends")
    .update({ unsubscribed_at: now })
    .eq("id", row.id);

  await supabase.from("email_events").insert({
    send_id: row.id,
    campaign_id: row.campaign_id,
    type: "unsubscribe",
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  if (row.lead_id) {
    await supabase
      .from("leads")
      .update({ is_suppressed: true, status: "do_not_contact" })
      .eq("id", row.lead_id);
  }

  // Any other campaign still holding this address in its queue must not
  // send now that the person has opted out.
  await supabase
    .from("email_sends")
    .update({ status: "skipped", error: "unsubscribed" })
    .eq("to_email", row.to_email)
    .eq("status", "queued");

  return page("Unsubscribed", `<h1>You are unsubscribed</h1>
    <p><strong>${esc(row.to_email)}</strong> will not receive further emails from ${esc(COMPANY.name)}.</p>
    <p class="muted">${esc(COMPANY.name)} &middot; ${esc(COMPANY.address)}</p>`);
}
