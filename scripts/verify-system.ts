/**
 * verify-system.ts — end-to-end proof that outreach works as designed.
 *
 *   npm run verify                                   # everything except a real send
 *   npm run verify -- --send-to you@yourdomain.com   # plus one real campaign email
 *
 * Runs the production code paths, not re-implementations of them:
 * environment loaded the way Next.js loads it, merge fields rendered by
 * the renderer campaigns use, audience resolved by resolveAudience, and
 * with --send-to a real campaign row dispatched by dispatchCampaign over
 * the real SMTP mailbox. Test rows it creates are removed afterwards, and
 * the one lead borrowed for realistic merge data is restored exactly.
 */

import { loadEnvConfig } from "@next/env";

type Result = { area: string; name: string; ok: boolean; detail: string };
const results: Result[] = [];
let area = "";

function check(name: string, ok: boolean, detail = "") {
  results.push({ area, name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  —  ${detail}` : ""}`);
}
function section(title: string) {
  area = title;
  console.log(`\n── ${title} ──`);
}

async function main() {
  // Exactly how the deployed app reads its environment, $-escaping and all.
  loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });
  const sendTo = (() => {
    const i = process.argv.indexOf("--send-to");
    return i > -1 ? process.argv[i + 1] : null;
  })();

  const { createSupabaseServiceClient } = await import("../src/lib/supabase-service");
  const { getMailerConfig, verifyTransport, closeTransport } = await import("../src/lib/mailer");
  const { renderCampaignEmail, sanitizeEmailHtml } = await import("../src/lib/campaign-render");
  const { resolveAudience, dispatchCampaign } = await import("../src/lib/campaigns");
  type Lead = import("../src/lib/leads").Lead;

  const db = createSupabaseServiceClient();

  // ── 1. Mail ────────────────────────────────────────────────
  section("Mail configuration");
  const mailer = getMailerConfig();
  check("SMTP configured", mailer !== null, mailer ? `${mailer.host}:${mailer.port}` : "missing vars");
  check("sends as company mailbox", mailer?.fromEmail === "rk@puravidanaturalindia.com", mailer?.fromEmail ?? "");
  const transport = await verifyTransport();
  check("SMTP login accepted", transport.ok, transport.ok ? "" : transport.error);

  // ── 2. Database ────────────────────────────────────────────
  section("Database schema");
  for (const [table, columns] of [
    ["leads", "id, company_name, contact_name, suggested_products, tags, priority, is_suppressed"],
    ["email_campaigns", "id, attachments, track_opens, batch_size, status"],
    ["email_sends", "id, claimed_at, status, message_id"],
    ["email_templates", "id, name, subject, body_html"],
    ["email_suppressions", "email, reason"],
    ["email_events", "id, type"],
  ] as const) {
    const { error } = await db.from(table).select(columns).limit(1);
    check(table, !error, error?.message ?? "all columns present");
  }

  // ── 3. Lead data ───────────────────────────────────────────
  section("Lead data");
  const { data: leadRows } = await db.from("leads").select("*").limit(5000);
  const leads = (leadRows ?? []) as Lead[];
  check("642 catalogue leads", leads.length === 642, `${leads.length}`);
  const enriched = leads.filter((l) => l.ai_status === "done").length;
  check("all leads AI-enriched", enriched === leads.length, `${enriched}/${leads.length}`);
  check("every lead has an email", leads.every((l) => l.email || l.company_email));

  const { data: productRows } = await db.from("products").select("name").limit(5000);
  const realProducts = new Set((productRows ?? []).map((p: { name: string }) => p.name.toLowerCase()));
  const suggestions = leads.flatMap((l) => l.suggested_products ?? []);
  const unreal = suggestions.filter((p) => !realProducts.has(p.toLowerCase()));
  check(
    "every suggested product exists on the website",
    unreal.length === 0,
    unreal.length ? `unknown: ${[...new Set(unreal)].slice(0, 3).join(", ")}` : `${suggestions.length} suggestions`
  );

  // ── 4. Every lead renders correctly ────────────────────────
  section("Personalisation — rendered for all 642 leads");
  const body = sanitizeEmailHtml(
    "<p>Dear {{full_name}},</p><p>{{icebreaker}}</p>" +
      "<p>Given what {{company}} works on, the lines most likely to be relevant are {{products}}.</p>"
  );
  const problems = new Map<string, string[]>();
  const flag = (kind: string, who: string) =>
    problems.set(kind, [...(problems.get(kind) ?? []), who]);

  for (const lead of leads) {
    const out = renderCampaignEmail({
      subject: "Botanical extracts for {{company}}",
      bodyHtml: body,
      lead,
      senderName: "R. Kumar",
      trackingId: "00000000-0000-0000-0000-000000000000",
      unsubscribeToken: "00000000-0000-0000-0000-000000000000",
    });
    const who = lead.company_name;
    if (/\{\{/.test(out.html) || /\{\{/.test(out.subject)) flag("unfilled {{token}}", who);
    if (!/Dear [A-Z][^,<]*,/.test(out.html)) flag("greeting malformed", who);
    if (/relevant are\s*\./.test(out.html)) flag("empty products sentence", who);
    if (/what\s+works on/.test(out.html)) flag("empty company", who);
    if (/unsubscribe/i.test(out.html) || /unsubscribe/i.test(out.text)) flag("unsubscribe present", who);
    if (out.html.includes("/api/t/o/")) flag("tracking pixel present", who);
    if (!out.html.includes("Pura Vida Natural LLP")) flag("signature missing", who);
    if (!out.text.includes("Pura Vida Natural LLP")) flag("text signature missing", who);
  }
  for (const kind of [
    "unfilled {{token}}",
    "greeting malformed",
    "empty products sentence",
    "empty company",
    "unsubscribe present",
    "tracking pixel present",
    "signature missing",
    "text signature missing",
  ]) {
    const hits = problems.get(kind) ?? [];
    check(`no ${kind}`, hits.length === 0, hits.length ? `${hits.length}: ${hits.slice(0, 2).join("; ")}` : "");
  }

  const sample = leads.find((l) => l.priority === "A" && l.contact_name) ?? leads[0];
  const sampleOut = renderCampaignEmail({
    subject: "Botanical extracts for {{company}}",
    bodyHtml: body,
    lead: sample,
    senderName: "R. Kumar",
    trackingId: "00000000-0000-0000-0000-000000000000",
    unsubscribeToken: "00000000-0000-0000-0000-000000000000",
  });
  console.log(`\n    example → ${sample.company_name}`);
  console.log(`    subject : ${sampleOut.subject}`);
  for (const line of sampleOut.text.split("\n").slice(0, 5)) if (line.trim()) console.log(`    ${line}`);

  // ── 5. Audience rules ──────────────────────────────────────
  section("Audience rules");
  const testSuppressed = "verify-suppressed@example.invalid";
  await db.from("email_suppressions").upsert({ email: testSuppressed, reason: "manual" });
  const audience = await resolveAudience({
    mode: "explicit",
    recipients: [
      { leadId: null, email: "verify-a@example.invalid", name: "A" },
      { leadId: null, email: "VERIFY-A@example.invalid", name: "A duplicate" },
      { leadId: null, email: testSuppressed, name: "Suppressed" },
    ],
  });
  await db.from("email_suppressions").delete().eq("email", testSuppressed);
  check("duplicates dropped (case-insensitive)", audience.dropped.duplicate === 1);
  check("unsubscribed/do-not-contact never mailed", audience.dropped.suppressed === 1);
  check("valid recipient kept", audience.members.length === 1);

  // ── 6. Saved emails ────────────────────────────────────────
  section("Saved emails (templates)");
  const { data: created, error: createError } = await db
    .from("email_templates")
    .insert({ name: "[verify] template", subject: "s", body_html: "<p>Dear {{full_name}},</p>" })
    .select("id")
    .single();
  check("save", !createError, createError?.message ?? "");
  if (created) {
    const { error: updateError } = await db
      .from("email_templates")
      .update({ subject: "s2" })
      .eq("id", created.id);
    check("update in place", !updateError);
    const { error: deleteError } = await db.from("email_templates").delete().eq("id", created.id);
    check("delete", !deleteError);
  }

  // ── 7. Real send through the campaign engine ───────────────
  section("Real campaign send");
  if (!sendTo) {
    console.log("  (skipped — add --send-to your@address to send one real campaign email)");
  } else if (!mailer || !transport.ok) {
    check("real send", false, "SMTP not usable, see above");
  } else {
    // Borrow a real lead for genuine merge data, but address the email
    // to the verifier. Its CRM fields are snapshotted and put back.
    const borrowed = sample;
    const before = { status: borrowed.status, last_contacted_at: borrowed.last_contacted_at };

    const { data: campaign, error: campaignError } = await db
      .from("email_campaigns")
      .insert({
        name: "[verify] end-to-end",
        subject: "Botanical extracts for {{company}}",
        body_html: sanitizeEmailHtml(
          "<p>Dear {{full_name}},</p><p>{{icebreaker}}</p>" +
            "<p>I'm with PuraVida Natural — we manufacture and export standardised botanical extracts, essential oils, oleoresins and fruit powders from India, with GMP/ISO documentation and full COA on every batch.</p>" +
            "<p>Given what {{company}} works on, the lines most likely to be relevant are {{products}}.</p>" +
            "<p>Would it be worth sending our catalogue and current price list?</p>"
        ),
        from_name: mailer.fromName,
        from_email: mailer.fromEmail,
        status: "sending",
        batch_size: 8,
        total_count: 1,
        attachments: [],
        track_opens: false,
        started_at: new Date().toISOString(),
        created_by: "verify-system",
      })
      .select("id")
      .single();
    check("campaign created", !campaignError, campaignError?.message ?? "");

    if (campaign) {
      const { error: sendRowError } = await db.from("email_sends").insert({
        campaign_id: campaign.id,
        lead_id: borrowed.id,
        to_email: sendTo.toLowerCase(),
        to_name: borrowed.contact_name,
        subject: "Botanical extracts for {{company}}",
      });
      check("recipient queued", !sendRowError, sendRowError?.message ?? "");

      const result = await dispatchCampaign(campaign.id);
      check("dispatcher sent it", result.sent === 1 && result.failed === 0, JSON.stringify(result));

      const { data: row } = await db
        .from("email_sends")
        .select("status, message_id, error, subject")
        .eq("campaign_id", campaign.id)
        .single();
      check("send row marked sent", row?.status === "sent", row?.error ?? "");
      check("SMTP message-id recorded", Boolean(row?.message_id), row?.message_id ?? "");
      check("subject personalised", !String(row?.subject).includes("{{"), row?.subject ?? "");

      const { data: camp } = await db
        .from("email_campaigns")
        .select("status, sent_count")
        .eq("id", campaign.id)
        .single();
      check("campaign completed", camp?.status === "sent" && camp?.sent_count === 1, JSON.stringify(camp));

      const { data: afterLead } = await db
        .from("leads")
        .select("status")
        .eq("id", borrowed.id)
        .single();
      check("lead moved to contacted", afterLead?.status === "contacted", afterLead?.status ?? "");

      // Clean up: the test campaign (sends cascade) and the lead's CRM state.
      await db.from("email_campaigns").delete().eq("id", campaign.id);
      await db.from("leads").update(before).eq("id", borrowed.id);
      console.log(`\n    Delivered to ${sendTo} — personalised as ${borrowed.company_name}.`);
    }
  }

  closeTransport();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n══ ${results.length - failed.length}/${results.length} checks passed ══\n`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL  [${f.area}] ${f.name} — ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
