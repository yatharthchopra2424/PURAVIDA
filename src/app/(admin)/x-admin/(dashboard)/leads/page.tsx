import { createSupabaseServiceClient } from "@/lib/supabase-service";
import {
  applyLeadFilters,
  DEFAULT_LEAD_FILTERS,
  LEAD_TABLE_COLUMNS,
  type Lead,
} from "@/lib/leads";
import LeadsClient from "./LeadsClient";

export const metadata = {
  title: "Leads — PuraVida Admin",
};

const PAGE_SIZE = 50;

async function getInitialData() {
  const supabase = createSupabaseServiceClient();

  const { data, count, error } = await applyLeadFilters(
    supabase.from("leads").select(LEAD_TABLE_COLUMNS, { count: "exact" }),
    DEFAULT_LEAD_FILTERS
  ).range(0, PAGE_SIZE - 1);

  if (error) {
    // The table has not been created yet, or the key is wrong. Surfacing
    // the message beats an empty screen with no explanation.
    return { leads: [], total: 0, sources: [], setupError: error.message };
  }

  // Distinct catalogue sources, for the source filter. Small enough to
  // read whole; a dedicated grouping query is not worth a round trip.
  const { data: sourceRows } = await supabase
    .from("leads")
    .select("source")
    .limit(5000);

  const sources = [
    ...new Set((sourceRows ?? []).map((r) => (r as { source: string }).source)),
  ].sort();

  return {
    leads: (data ?? []) as unknown as Lead[],
    total: count ?? 0,
    sources,
    setupError: null,
  };
}

export default async function LeadsPage() {
  const { leads, total, sources, setupError } = await getInitialData();

  return (
    <LeadsClient
      initialLeads={leads}
      initialTotal={total}
      sources={sources}
      setupError={setupError}
      pageSize={PAGE_SIZE}
    />
  );
}
