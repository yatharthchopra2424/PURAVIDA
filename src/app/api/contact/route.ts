import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { ContactSchema, formatZodIssues } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  renderAdminNotificationEmail,
  renderCustomerConfirmationEmail,
} from "@/lib/email-templates";
import { isMailerConfigured, sendMail, closeTransport } from "@/lib/mailer";
import { COMPANY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // ── 1 · Throttle before doing any work ────────────────────
    // This endpoint writes to the database with the service-role
    // client and opens an SMTP connection. Unthrottled, a trivial
    // script can fill the inbox and get the mailbox rate-limited.
    const ip = getClientIp(req.headers);
    const rate = await checkRateLimit(ip);

    if (!rate.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rate.reset - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error:
            "Too many enquiries from this network. Please try again later, or email us directly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": String(rate.remaining),
          },
        }
      );
    }

    // ── 2 · Validate ──────────────────────────────────────────
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = ContactSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission", fields: formatZodIssues(parsed.error) },
        { status: 400 }
      );
    }

    const { name, email, product, quantity, description, cartItems } =
      parsed.data;

    // ── 3 · Honeypot ──────────────────────────────────────────
    // Hidden field: a human never fills it, bots that complete every
    // input do. Respond 200 so the bot has no signal it was caught.
    if (parsed.data.company_website) {
      console.warn(`[contact] Honeypot triggered from ${ip}`);
      return NextResponse.json({ success: true });
    }

    // ── 4 · Persist ───────────────────────────────────────────
    let persisted = false;
    try {
      const supabase = createSupabaseServiceClient();
      const { error: dbError } = await supabase.from("contacts").insert({
        name,
        email,
        product: product || null,
        quantity: quantity || null,
        description: description || null,
        cart_items: cartItems.length > 0 ? cartItems : null,
        is_read: false,
      });

      if (dbError) throw dbError;
      persisted = true;
    } catch (dbError) {
      console.error("[contact] DB insert failed", dbError);
    }

    // ── 5 · Email ─────────────────────────────────────────────
    // Sent over the company's own SMTP mailbox, the same transport the
    // outbound campaigns use. No third-party sending API is involved,
    // so there is no verified-sender sandbox to fall foul of and no
    // provider quota between a customer and their confirmation.
    const recipientEmail = process.env.CONTACT_EMAIL?.trim() || COMPANY.email;
    const emailData = { name, email, product, quantity, description, cartItems };

    let emailed = false;
    let confirmed = false;

    if (isMailerConfigured()) {
      const admin = renderAdminNotificationEmail(emailData);
      const confirmation = renderCustomerConfirmationEmail(emailData);

      // Both messages go out together. The customer is waiting on this
      // response, and sending in series would add a whole SMTP
      // round-trip to their page load for no benefit.
      const [adminResult, customerResult] = await Promise.allSettled([
        sendMail({
          to: recipientEmail,
          subject: admin.subject,
          html: admin.html,
          text: admin.text,
          // Hitting reply in the team inbox answers the customer directly.
          replyTo: email,
        }),
        sendMail({
          to: email,
          toName: name,
          subject: confirmation.subject,
          html: confirmation.html,
          text: confirmation.text,
          replyTo: recipientEmail,
        }),
      ]);

      emailed = adminResult.status === "fulfilled";
      confirmed = customerResult.status === "fulfilled";

      if (adminResult.status === "rejected") {
        console.error("[contact] Admin notification send failed", adminResult.reason);
      }
      if (customerResult.status === "rejected") {
        // Best-effort: the lead is already captured above, so a failed
        // confirmation must not become a 500 for the customer.
        console.error("[contact] Customer confirmation send failed", customerResult.reason);
      }

      // Serverless instances are frozen between invocations; an idle
      // pooled socket left open is one the next request cannot reuse
      // anyway, and it keeps the instance from shutting down cleanly.
      closeTransport();
    } else {
      console.log("─── NEW QUOTE INQUIRY (SMTP not configured) ───");
      console.log(renderAdminNotificationEmail(emailData).text);
      console.log("───────────────────────────────────────────────");
    }

    // Only report success if the enquiry was captured somewhere. If both
    // the database and the admin notification failed, the lead is
    // genuinely lost and the user must be told rather than shown a
    // thank-you screen. A failed *confirmation* does not count — the
    // lead itself is still safely captured.
    if (!persisted && !emailed && isMailerConfigured()) {
      return NextResponse.json(
        {
          error:
            "We could not record your enquiry. Please email us directly at " +
            recipientEmail,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, confirmationSent: confirmed });
  } catch (err) {
    console.error("[contact] Unhandled error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
