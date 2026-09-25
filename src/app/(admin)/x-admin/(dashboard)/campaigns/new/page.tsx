import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isMailerConfigured, getMailerConfig } from "@/lib/mailer";
import { renderSignature } from "@/lib/signature";
import ComposerClient from "./ComposerClient";

export const metadata = {
  title: "New campaign — PuraVida Admin",
};

export default async function NewCampaignPage() {
  const supabase = createSupabaseServiceClient();
  const auth = await createSupabaseServerClient();

  const [{ data: templates }, { data: { user } }] = await Promise.all([
    supabase
      .from("email_templates")
      .select("id, name, subject, body_html")
      .order("updated_at", { ascending: false })
      .limit(200),
    auth.auth.getUser(),
  ]);

  const domestic = getMailerConfig("domestic");
  const exportMailer = getMailerConfig("export");

  return (
    <ComposerClient
      templates={templates ?? []}
      adminEmail={user?.email ?? ""}
      mailerByIdentity={{
        domestic: {
          configured: isMailerConfigured("domestic"),
          fromAddress: domestic ? `${domestic.fromName} <${domestic.fromEmail}>` : null,
          defaultSenderName: domestic?.fromName ?? "",
        },
        export: {
          configured: isMailerConfigured("export"),
          fromAddress: exportMailer ? `${exportMailer.fromName} <${exportMailer.fromEmail}>` : null,
          defaultSenderName: exportMailer?.fromName ?? "",
        },
      }}
      // Rendered server-side from the app's own signature module so the
      // composer shows exactly the markup that will be sent, rather
      // than a second approximation of it that can drift.
      signatureHtml={renderSignature().html}
    />
  );
}
