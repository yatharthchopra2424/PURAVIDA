/**
 * verify-ingestion.ts — CLI wrapper for verify-ingestion-core.ts.
 *
 *   npm run leads:verify-ingestion
 *
 * The same checks also run from the admin's Data Sources page
 * ("Run validation" button, src/app/api/admin/data-sources/verify) —
 * this file exists only to load .env.local and print the result when
 * run from a terminal instead of a browser. See verify-ingestion-core.ts
 * for what actually gets checked.
 */

import { loadEnv, serviceClient } from "./_env";
import { verifyLatestIngestionRun } from "./verify-ingestion-core";

async function main() {
  loadEnv();
  const supabase = serviceClient();

  const result = await verifyLatestIngestionRun(supabase);

  if (!result.hasRun) {
    console.log("\n  No ingestion runs logged yet. Run `npm run leads:extract-raw` first.\n");
    return;
  }

  console.log(`\n  Folder: ${result.sourceFolder}\n`);
  console.log(result.notes.map((n) => `  ${n}`).join("\n"));
  console.log(`\n  ${result.ok ? "VALIDATED" : "FAILED"}\n`);

  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
