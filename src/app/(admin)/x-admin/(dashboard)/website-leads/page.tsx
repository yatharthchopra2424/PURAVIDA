import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { WEBSITE_LEAD_COLUMNS } from "@/lib/website-leads";
import WebsiteLeadsClient, { type WebsiteLead } from "./WebsiteLeadsClient";

export const metadata = { title: "Website Leads — PuraVida Admin" };
export const dynamic = "force-dynamic";

export default async function WebsiteLeadsPage() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("website_leads")
    .select(WEBSITE_LEAD_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);

  // Enquiries captured by the old form (or while website_leads didn't exist yet).
  const { count: legacyCount } = await supabase.from("contacts").select("id", { count: "exact", head: true });

  return (
    <WebsiteLeadsClient
      initial={(data ?? []) as WebsiteLead[]}
      missingTable={Boolean(error)}
      legacyCount={legacyCount ?? 0}
    />
  );
}
