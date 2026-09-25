/**
 * import-leads.ts — extraction JSON → Supabase `leads`.
 *
 *   npm run leads:import
 *   npm run leads:import -- --file scripts/leads/out/iphex-2026.json --dry-run
 *
 * Upserts on (source, source_ref), so re-running after a re-extraction
 * refreshes the catalogue fields in place rather than duplicating rows.
 *
 * Only catalogue-derived columns are written. AI enrichment (segment,
 * tags, scores) and CRM state (status, notes, suppression) are left
 * untouched, because re-importing a corrected PDF must not wipe work
 * done in the admin panel.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnv, parseArgs, serviceClient } from "./_env";
import type { NormalizedLead } from "./extract-catalog";

const CHUNK_SIZE = 200;

interface ExtractionFile {
  source: string;
  pdf: string;
  extractedAt: string;
  leadCount: number;
  leads: NormalizedLead[];
}

/** Snake-cases one extracted lead into a `leads` row. */
function toRow(lead: NormalizedLead, hasRawColumns: boolean) {
  const phones = lead.phones ?? [];
  return {
    source: lead.source,
    source_ref: lead.sourceRef,
    source_page: lead.sourcePage,
    company_name: lead.companyName,
    contact_name: lead.contactName,
    salutation: lead.salutation,
    designation: lead.designation,
    email: lead.email,
    company_email: lead.companyEmail,
    mobile: lead.mobile,
    mobile_e164: lead.mobileE164,
    // Without the `phones` column every number still has to land
    // somewhere: a contact with several is kept as one " / "-joined value.
    phone: hasRawColumns || phones.length <= 1 ? lead.phone : phones.join(" / "),
    website: lead.website,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    postal_code: lead.postalCode,
    country: lead.country,
    hall_no: lead.hallNo,
    stall_no: lead.stallNo,
    company_profile: lead.companyProfile,
    product_categories: lead.productCategories,
    product_category_raw: lead.productCategoryRaw,
    parse_warnings: lead.parseWarnings,
    ...(hasRawColumns
      ? {
          phones,
          raw_data: lead.rawData ?? {},
          source_files: lead.sourceFiles ?? [],
          country_source: lead.countrySource ?? null,
        }
      : {}),
  };
}

async function main() {
  loadEnv();
  const args = parseArgs();

  const filePath = path.resolve(
    process.cwd(),
    String(args.file ?? "scripts/leads/out/iphex-2025.json")
  );
  const dryRun = Boolean(args["dry-run"]);

  if (!fs.existsSync(filePath)) {
    console.error(
      `\n  Not found: ${filePath}\n  Run \`npm run leads:extract\` first.\n`
    );
    process.exit(1);
  }

  const payload: ExtractionFile = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const probe = await serviceClient().from("leads").select("raw_data, phones").limit(1);
  const hasRawColumns = !probe.error;
  const rows = payload.leads.map((l) => toRow(l, hasRawColumns));

  console.log(`\n  ${path.basename(filePath)}`);
  console.log(`  source     ${payload.source}`);
  console.log(`  extracted  ${payload.extractedAt}`);
  console.log(`  rows       ${rows.length}\n`);

  // A row with neither email is unreachable, so it is worth seeing the
  // count before it silently pads the database.
  const unreachable = rows.filter((r) => !r.email && !r.company_email).length;
  if (unreachable) console.log(`  ${unreachable} rows have no email address\n`);

  if (dryRun) {
    console.log("  --dry-run: nothing written. Sample row:\n");
    console.log(JSON.stringify(rows[0], null, 2));
    return;
  }

  const supabase = serviceClient();
  let written = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    const { error, count } = await supabase
      .from("leads")
      .upsert(chunk, { onConflict: "source,source_ref", count: "exact" });

    if (error) {
      console.error(`\n  Upsert failed at row ${i}: ${error.message}`);
      if (error.message.includes("does not exist")) {
        console.error(
          "  Run scripts/leads/leads-schema.sql in the Supabase SQL editor first.\n"
        );
      }
      process.exit(1);
    }

    written += count ?? chunk.length;
    process.stdout.write(`  upserted ${Math.min(i + CHUNK_SIZE, rows.length)}/${rows.length}\r`);
  }

  const { count: total } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("source", payload.source);

  console.log(`\n\n  Upserted ${written} rows.`);
  console.log(`  \`leads\` now holds ${total ?? "?"} rows for ${payload.source}.`);
  console.log(`\n  Next: npm run leads:enrich\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
