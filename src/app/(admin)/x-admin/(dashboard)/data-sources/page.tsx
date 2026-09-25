import { createSupabaseServiceClient } from "@/lib/supabase-service";
import DataSourcesClient, { type IngestionRun } from "./DataSourcesClient";

export const metadata = {
  title: "Data Sources — PuraVida Admin",
};

/**
 * How much data has actually been pulled in, from where, and whether it
 * has been checked — the report the extraction scripts print to a
 * terminal that then closes, made permanent and visible here instead.
 *
 * Everything on this page is read-only. Extraction, import and
 * enrichment are run.run.run — deliberately, since they touch the local
 * filesystem (the raw spreadsheets/docs live outside the deployed app)
 * and cost real API calls; this page reports what those runs did, it
 * does not trigger them.
 */
export default async function DataSourcesPage() {
  const supabase = createSupabaseServiceClient();

  const { data: runs, error: runsError } = await supabase
    .from("data_ingestion_runs")
    .select(
      "id, source_folder, started_at, finished_at, files, totals, validated, validated_at, validation_notes, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const [
    { count: totalLeads },
    { count: domesticLeads },
    { count: exportLeads },
    { count: unknownMarketLeads },
    { count: pendingAi },
    { count: doneAi },
    { count: failedAi },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("market", "domestic"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("market", "export"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("market", "unknown"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("ai_status", "pending"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("ai_status", "done"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("ai_status", "failed"),
  ]);

  return (
    <DataSourcesClient
      runs={(runs ?? []) as IngestionRun[]}
      runsError={runsError?.message ?? null}
      leadStats={{
        total: totalLeads ?? 0,
        domestic: domesticLeads ?? 0,
        export: exportLeads ?? 0,
        unknownMarket: unknownMarketLeads ?? 0,
        aiPending: pendingAi ?? 0,
        aiDone: doneAi ?? 0,
        aiFailed: failedAi ?? 0,
      }}
    />
  );
}
