/**
 * Attaches "which raw file did this lead come from" to a list of
 * email_sends rows, so a bounced or rejected address in the campaign
 * report points straight back at the spreadsheet/doc to go re-check —
 * `npm run leads:extract-raw -- --file "<name>"` re-reads just that one
 * file in seconds.
 *
 * Shared by the campaign report's server page (first paint) and its
 * refresh API route, so both show the same thing rather than the page
 * loading with no source file and only getting it after a client fetch.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSourceFile } from "../../scripts/leads/raw-shared";

interface WithLeadId {
  lead_id: string | null;
}

export interface WithSource {
  source: string | null;
  sourceFile: string | null;
}

export async function attachSourceFiles<T extends WithLeadId>(
  supabase: SupabaseClient,
  recipients: T[]
): Promise<(T & WithSource)[]> {
  const leadIds = [...new Set(recipients.map((r) => r.lead_id).filter((v): v is string => v !== null))];

  if (leadIds.length === 0) {
    return recipients.map((r) => ({ ...r, source: null, sourceFile: null }));
  }

  const [{ data: leadSources }, { data: latestRun }] = await Promise.all([
    supabase.from("leads").select("id, source").in("id", leadIds),
    supabase
      .from("data_ingestion_runs")
      .select("files")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const ingestionFiles = ((latestRun as { files?: { file: string }[] } | null)?.files ?? []) as {
    file: string;
  }[];
  const sourceByLeadId = new Map(
    ((leadSources ?? []) as { id: string; source: string }[]).map((l) => [l.id, l.source])
  );

  return recipients.map((r) => {
    const source = r.lead_id ? (sourceByLeadId.get(r.lead_id) ?? null) : null;
    return {
      ...r,
      source,
      sourceFile: source ? resolveSourceFile(source, ingestionFiles) : null,
    };
  });
}
