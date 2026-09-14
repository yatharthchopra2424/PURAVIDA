import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { getMailerConfig, isMailerConfigured, sendCampaignMail } from "@/lib/mailer";
import {
  renderCampaignEmail,
  unknownTokens,
  sanitizeEmailHtml,
} from "@/lib/campaign-render";
import {
  applyLeadFilters,
  parseLeadFilters,
  primaryEmail,
  type Lead,
} from "@/lib/leads";

const PreviewSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(200_000),
  senderName: z.string().trim().max(120).optional(),
  /** Preview against this lead; otherwise the first match of the filters. */
  leadId: z.uuid().optional(),
  query: z.string().max(2000).optional(),
  /** When set, actually delivers the rendered preview to this address. */
  sendTestTo: z.email().max(200).optional(),
  /** Mirrors the composer's signature toggle. */
  includeSignature: z.boolean().optional(),
  trackOpens: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = createSupabaseServiceClient();

  // Pick the lead the preview is rendered against: an explicit one, or
  // the first row of the same filtered list the composer is targeting,
  // so what is on screen matches what the first recipient will get.
  let lead: Lead | null = null;

  if (input.leadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", input.leadId).single();
    lead = (data as Lead) ?? null;
  } else if (input.query) {
    const { data } = await applyLeadFilters(
      supabase.from("leads").select("*"),
      parseLeadFilters(new URLSearchParams(input.query))
    ).limit(1);
    lead = ((data ?? [])[0] as Lead) ?? null;
  }

  if (!lead) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .not("email", "is", null)
      .order("icp_score", { ascending: false, nullsFirst: false })
      .limit(1);
    lead = ((data ?? [])[0] as Lead) ?? null;
  }

  if (!lead) {
    return NextResponse.json(
      { error: "No leads to preview against. Import the catalogue first." },
      { status: 400 }
    );
  }

  const senderName =
    input.senderName?.trim() || getMailerConfig()?.fromName || "PuraVida Natural";

  const rendered = renderCampaignEmail({
    subject: input.subject,
    bodyHtml: sanitizeEmailHtml(input.bodyHtml),
    lead,
    senderName,
    // Placeholder ids: a preview must not create tracking rows, and its
    // pixel and links are stripped anyway.
    trackingId: "00000000-0000-0000-0000-000000000000",
    unsubscribeToken: "00000000-0000-0000-0000-000000000000",
    preview: true,
    includeSignature: input.includeSignature,
    tracking: input.trackOpens,
  });

  // Unknown {{tokens}} reach the recipient verbatim, so surfacing them
  // before the send is the difference between a typo and 600 people
  // reading "Hi {{firstname}}".
  const unknown = [
    ...new Set([...unknownTokens(input.subject), ...unknownTokens(input.bodyHtml)]),
  ];

  let testSend: { ok: boolean; error?: string } | null = null;

  if (input.sendTestTo) {
    if (!isMailerConfigured()) {
      testSend = { ok: false, error: "SMTP is not configured." };
    } else {
      try {
        await sendCampaignMail({
          to: input.sendTestTo,
          subject: `[TEST] ${rendered.subject}`,
          html: rendered.html,
          text: rendered.text,
        });
        testSend = { ok: true };
      } catch (err) {
        testSend = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  return NextResponse.json({
    data: {
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      unknownTokens: unknown,
      testSend,
      previewLead: {
        id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: primaryEmail(lead),
      },
    },
  });
}
