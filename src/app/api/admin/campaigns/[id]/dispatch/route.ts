import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { dispatchCampaign } from "@/lib/campaigns";
import { closeTransport } from "@/lib/mailer";

/**
 * Sends one batch for this campaign, on demand.
 *
 * The admin panel calls this repeatedly while the campaign page is
 * open, which makes the send visible and abortable. The cron route
 * does the same work unattended, so closing the browser does not stall
 * a campaign half-sent.
 */
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const result = await dispatchCampaign(id);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // The pooled SMTP connection must not outlive the invocation, or
    // the platform keeps the instance alive waiting on an idle socket.
    closeTransport();
  }
}
