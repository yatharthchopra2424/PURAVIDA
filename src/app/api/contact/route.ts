import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { ContactSchema, formatZodIssues } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  renderAdminNotificationEmail,
  renderCustomerConfirmationEmail,
} from "@/lib/email-templates";

export const dynamic = "force-dynamic";

/** Strips CR/LF so user input can never inject extra email headers. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  try {
    // ── 1 · Throttle before doing any work ────────────────────
    // This endpoint writes to the database with the service-role
    // client and sends email via Resend. Unthrottled, a trivial
    // script can fill the inbox and burn the email quota.
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
    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail =
      process.env.CONTACT_EMAIL || "ps@puravidanaturalindia.com";

    // NOTE: `from` must be a verified domain in Resend. The sandbox
    // sender onboarding@resend.dev can only deliver to the Resend
    // account's own address — it CANNOT reach arbitrary customers, so
    // the confirmation email below will silently fail until a real
    // domain is verified. See ADD-SEARCH-CONSOLE.md / README for the
    // one-time setup.
    const fromAddress =
      process.env.RESEND_FROM || "PuraVida Quotes <onboarding@resend.dev>";

    const emailData = { name, email, product, quantity, description, cartItems };

    let emailed = false;
    let confirmed = false;
    if (resendApiKey) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        const admin = renderAdminNotificationEmail(emailData);
        await resend.emails.send({
          from: fromAddress,
          to: recipientEmail,
          replyTo: email,
          subject: sanitizeHeaderValue(admin.subject),
          html: admin.html,
          text: admin.text,
        });
        emailed = true;
      } catch (emailError) {
        console.error("[contact] Admin notification send failed", emailError);
      }

      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        const confirmation = renderCustomerConfirmationEmail(emailData);
        await resend.emails.send({
          from: fromAddress,
          to: email,
          replyTo: recipientEmail,
          subject: sanitizeHeaderValue(confirmation.subject),
          html: confirmation.html,
          text: confirmation.text,
        });
        confirmed = true;
      } catch (emailError) {
        // Best-effort: the lead is already captured above, so a failed
        // confirmation email should not turn into a 500 for the customer.
        console.error("[contact] Customer confirmation send failed", emailError);
      }
    } else {
      console.log("─── NEW QUOTE INQUIRY (Resend not configured) ───");
      console.log(renderAdminNotificationEmail(emailData).text);
      console.log("─────────────────────────────────────────────────");
    }

    // Only report success if the enquiry was captured somewhere. If
    // both the database and the admin notification failed, the lead is
    // genuinely lost and the user must be told rather than shown a
    // thank-you screen. A failed *confirmation* email doesn't count —
    // the lead itself is still safely captured.
    if (!persisted && !emailed && resendApiKey) {
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
