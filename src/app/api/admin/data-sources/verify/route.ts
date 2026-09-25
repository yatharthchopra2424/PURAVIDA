import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { verifyLatestIngestionRun } from "../../../../../../scripts/leads/verify-ingestion-core";

/**
 * "Run validation" on the Data Sources page — the same three checks
 * `npm run leads:verify-ingestion` runs from a terminal, triggered from
 * the browser instead.
 *
 * The re-extraction check needs the raw spreadsheets/docs on disk,
 * which only exist on whatever machine has docs/raw-leads/ checked
 * out — never a deployed instance. Run against production this still
 * checks the database arithmetic and reports the file check as skipped
 * rather than failing; run against a local dev server it does the full
 * job. This can take a couple of minutes against ~70 files, hence the
 * generous duration.
 */
export const maxDuration = 300;

export async function POST() {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseServiceClient();

  try {
    const result = await verifyLatestIngestionRun(supabase);
    if (!result.hasRun) {
      return NextResponse.json(
        { error: "No ingestion runs logged yet. Run `npm run leads:extract-raw` first." },
        { status: 400 }
      );
    }
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
