import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, product, quantity, description, cartItems } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    // ── Build email body ────────────────────────────────────────────
    const cartSection =
      cartItems && cartItems.length > 0
        ? `\n\nQuote Cart:\n${cartItems
            .map(
              (item: { name: string; quantity: number }) =>
                `  • ${item.name} — qty ${item.quantity}`
            )
            .join("\n")}`
        : "";

    const emailBody = `
New quote inquiry from ${name} <${email}>

Product: ${product || "Not specified"}
Quantity: ${quantity || "Not specified"}

Additional Details:
${description || "None provided"}
${cartSection}
`.trim();

    // ── Attempt Resend if configured ────────────────────────────────
    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.CONTACT_EMAIL || "info@puravidanatural.com";

    if (resendApiKey) {
      // Dynamic import so the build doesn't fail when resend isn't available
      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);

      await resend.emails.send({
        from: "PuraVida Quotes <onboarding@resend.dev>",
        to: recipientEmail,
        replyTo: email,
        subject: `Quote Request — ${product || "General Inquiry"} from ${name}`,
        text: emailBody,
      });
    } else {
      // Graceful fallback: log the inquiry so nothing is lost
      console.log("─── NEW QUOTE INQUIRY (Resend not configured) ───");
      console.log(emailBody);
      console.log("─────────────────────────────────────────────────");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
