import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { formatZodIssues } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { renderQuoteConfirmationEmail, renderQuoteNotificationEmail } from "@/lib/email-templates";
import { isMailerConfigured, sendMail, closeTransport } from "@/lib/mailer";
import { COMPANY } from "@/lib/constants";
import { absoluteUrl } from "@/lib/site";
import { classifyLeadMarket } from "@/lib/leads";
import { QuoteRequestSchema, matchQuoteItems, formatQuantity, type MatchedItem } from "@/lib/quote";

export const dynamic = "force-dynamic";

/**
 * Quote / contact form.
 *
 *   1. throttle → validate → honeypot
 *   2. match every requested product against the real catalogue
 *   3. SAVE FIRST: website_leads row, then link or create a row in `leads`
 *      so the enquiry is reachable by campaigns, before any email is tried
 *   4. confirmation to the buyer from pk@ (falls back to rk@ until the
 *      pk@ mailbox is configured) and a notification to the team
 *
 * A failed email never loses the enquiry; a failed save with no email
 * either is the only case reported as an error to the buyer.
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1 · Throttle ──────────────────────────────────────────
    const ip = getClientIp(req.headers);
    const rate = await checkRateLimit(ip);
    if (!rate.success) {
      const retryAfter = Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many enquiries from this network. Please try again later, or email us directly." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = QuoteRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the highlighted fields", fields: formatZodIssues(parsed.error) },
        { status: 400 }
      );
    }
    const q = parsed.data;

    // Honeypot: answer like a success so a bot learns nothing.
    if (q.company_website) {
      console.warn(`[contact] Honeypot triggered from ${ip}`);
      return NextResponse.json({ success: true, reference: "PV-000000" });
    }

    // ── 2 · Match products ────────────────────────────────────
    const items: MatchedItem[] = await matchQuoteItems(q);
    const message = [q.message, q.description, !q.items.length && q.quantity ? `Quantity: ${q.quantity}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const email = q.email.toLowerCase();
    const market = classifyLeadMarket({ country: q.country || null, email });
    const reference = `PV-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const ipCountry = req.headers.get("x-vercel-ip-country");

    // ── 3 · Save ──────────────────────────────────────────────
    const supabase = createSupabaseServiceClient();
    let websiteLeadId: string | null = null;
    let persisted = false;

    const { data: wl, error: wlError } = await supabase
      .from("website_leads")
      .insert({
        name: q.name,
        company: q.company || null,
        email,
        phone: q.phone || null,
        country: q.country || null,
        market,
        buyer_type: q.buyerType ?? null,
        items,
        message: message || null,
        wants_samples: q.wantsSamples,
        source_page: q.sourcePage ?? null,
        referrer: q.referrer ?? null,
        utm_source: q.utm?.source ?? null,
        utm_medium: q.utm?.medium ?? null,
        utm_campaign: q.utm?.campaign ?? null,
        ip_country: ipCountry,
        quote_notes: `Reference ${reference}`,
      })
      .select("id")
      .single();

    if (!wlError && wl) {
      websiteLeadId = wl.id;
      persisted = true;
    } else {
      // website_leads not created yet (scripts/website-schema.sql not run):
      // keep capturing into the original inbox table.
      console.error("[contact] website_leads insert failed, falling back to contacts", wlError?.message);
      const { error: cError } = await supabase.from("contacts").insert({
        name: q.name,
        email,
        product: items.map((i) => i.name).join(", ").slice(0, 500) || null,
        quantity: items.map((i) => `${i.name}: ${formatQuantity(i)}`).join("; ").slice(0, 500) || null,
        description: [q.company && `Company: ${q.company}`, q.phone && `Phone: ${q.phone}`, q.country && `Country: ${q.country}`, message]
          .filter(Boolean)
          .join("\n") || null,
        cart_items: items.length ? items.map((i) => ({ name: i.name, quantity: Math.max(1, Math.round(i.quantity ?? 1)) })) : null,
        is_read: false,
      });
      persisted = !cError;
      if (cError) console.error("[contact] contacts insert failed", cError.message);
    }

    // Link to (or create) the lead so campaigns and the Leads page see it.
    let leadId: string | null = null;
    try {
      // Two plain equality lookups rather than an `.or()` filter string, so
      // nothing the buyer typed is ever parsed as PostgREST filter syntax.
      const byEmail = await supabase.from("leads").select("id, notes").eq("email", email).limit(1).maybeSingle();
      const existing =
        byEmail.data ??
        (await supabase.from("leads").select("id, notes").eq("company_email", email).limit(1).maybeSingle()).data;

      const note = `[${new Date().toISOString().slice(0, 10)}] Website quote ${reference}: ${items.map((i) => `${i.name} (${formatQuantity(i)})`).join(", ") || "general enquiry"}`;

      if (existing) {
        leadId = existing.id;
        await supabase
          .from("leads")
          .update({
            notes: [note, existing.notes].filter(Boolean).join("\n").slice(0, 4000),
          })
          .eq("id", existing.id);
      } else {
        const domain = email.split("@")[1] ?? "";
        const { data: created } = await supabase
          .from("leads")
          .upsert(
            {
              source: "website",
              source_ref: `website#${email}`,
              company_name: q.company || `Unknown — ${domain}`,
              contact_name: q.name,
              email,
              phone: q.phone || null,
              country: q.country || null,
              market,
              notes: note,
              product_category_raw: items.map((i) => i.name).join(", ").slice(0, 500) || null,
            },
            { onConflict: "source,source_ref" }
          )
          .select("id")
          .single();
        leadId = created?.id ?? null;
      }
    } catch (err) {
      console.error("[contact] lead link failed", err);
    }
    if (websiteLeadId && leadId) {
      await supabase.from("website_leads").update({ lead_id: leadId }).eq("id", websiteLeadId);
    }

    // ── 4 · Email ─────────────────────────────────────────────
    const teamInbox = process.env.CONTACT_EMAIL?.trim() || COMPANY.email;
    const confirmIdentity = isMailerConfigured("pk") ? "pk" : "domestic";
    const emailData = {
      name: q.name,
      company: q.company,
      email,
      phone: q.phone,
      country: q.country,
      buyerType: q.buyerType,
      items: items.map((i) => ({
        name: i.name,
        slug: i.slug,
        categorySlug: i.categorySlug,
        quantityLabel: formatQuantity(i),
        grade: i.grade,
        matched: i.matched,
        requestedAs: i.requestedAs,
      })),
      message,
      wantsSamples: q.wantsSamples,
      reference,
      sourcePage: q.sourcePage,
      adminUrl: absoluteUrl("/x-admin/website-leads"),
    };

    let notified = false;
    let confirmed = false;
    const errors: string[] = [];

    if (isMailerConfigured("domestic") || isMailerConfigured("pk")) {
      const confirmation = renderQuoteConfirmationEmail(emailData);
      const notification = renderQuoteNotificationEmail(emailData);
      const [adminResult, customerResult] = await Promise.allSettled([
        isMailerConfigured("domestic")
          ? sendMail({ to: teamInbox, subject: notification.subject, html: notification.html, text: notification.text, replyTo: email })
          : Promise.reject(new Error("team SMTP not configured")),
        sendMail({
          identity: confirmIdentity,
          to: email,
          toName: q.name,
          subject: confirmation.subject,
          html: confirmation.html,
          text: confirmation.text,
          replyTo: confirmIdentity === "pk" ? null : teamInbox,
        }),
      ]);
      notified = adminResult.status === "fulfilled";
      confirmed = customerResult.status === "fulfilled";
      if (adminResult.status === "rejected") errors.push(`team: ${String(adminResult.reason).slice(0, 200)}`);
      if (customerResult.status === "rejected") errors.push(`customer: ${String(customerResult.reason).slice(0, 200)}`);
      closeTransport();
    } else {
      errors.push("SMTP not configured");
    }
    if (errors.length) console.error("[contact] email failures", errors);

    if (websiteLeadId) {
      await supabase
        .from("website_leads")
        .update({ confirmation_sent: confirmed, notification_sent: notified, email_error: errors.join(" | ") || null })
        .eq("id", websiteLeadId);
    }

    if (!persisted && !notified) {
      return NextResponse.json(
        { error: `We could not record your enquiry. Please email us directly at ${teamInbox}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reference, confirmationSent: confirmed, items: items.length });
  } catch (err) {
    console.error("[contact] Unhandled error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
