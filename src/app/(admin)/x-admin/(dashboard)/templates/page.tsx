import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { TEMPLATE_COLUMNS, type EmailTemplate } from "@/lib/templates";
import TemplatesClient from "./TemplatesClient";

export const metadata = {
  title: "Saved emails — PuraVida Admin",
};

export default async function TemplatesPage() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select(TEMPLATE_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(200);

  return (
    <TemplatesClient
      initialTemplates={(data ?? []) as EmailTemplate[]}
      loadError={error?.message ?? null}
    />
  );
}
