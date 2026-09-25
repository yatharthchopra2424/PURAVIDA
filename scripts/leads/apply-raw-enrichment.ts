/**
 * apply-raw-enrichment.ts — back-fills leads that are already in the
 * database with everything the raw files said about them.
 *
 *   npm run leads:apply-raw
 *   npm run leads:apply-raw -- --dry-run
 *
 * The first import only captured a handful of fields, so most leads have
 * no country, city, address or notes even though the source sheet had
 * them. extract-raw-folder.ts now reads all of it and merges the copies
 * of each address found in different files; this applies that result to
 * the matching rows (matched by email).
 *
 * Deliberately conservative — it only ever ADDS:
 *   - a column already holding a value is left alone (a corrected value
 *     from the AI or an admin edit is never overwritten);
 *   - AI enrichment and CRM state (status, notes, tags…) are not touched;
 *   - `market` is only set on leads still marked unknown, so a market
 *     chosen by hand is safe.
 * `raw_data`, `source_files` and `country_source` are refreshed each
 * time, since they describe the source, not a decision.
 *
 * Needs the updated leads-schema.sql for those three columns; without
 * it the ordinary fields are still filled and the script says so.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnv, parseArgs, serviceClient } from "./_env";
import type { NormalizedLead } from "./extract-catalog";
import { classifyLeadMarket } from "../../src/lib/leads";

interface DbRow {
  id: string;
  email: string | null;
  company_email: string | null;
  market: string;
  company_name: string;
  contact_name: string | null;
  designation: string | null;
  phone: string | null;
  phones?: string[] | null;
  mobile: string | null;
  mobile_e164: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  company_profile: string | null;
  product_category_raw: string | null;
}

const COLUMNS =
  "id, email, company_email, market, company_name, contact_name, designation, phone, mobile, mobile_e164, " +
  "website, address, city, state, postal_code, country, company_profile, product_category_raw";

// merged-lead field → column, filled only where the column is empty.
const FILL: [keyof NormalizedLead, keyof DbRow][] = [
  ["contactName", "contact_name"],
  ["designation", "designation"],
  ["phone", "phone"],
  ["mobile", "mobile"],
  ["mobileE164", "mobile_e164"],
  ["website", "website"],
  ["address", "address"],
  ["city", "city"],
  ["state", "state"],
  ["postalCode", "postal_code"],
  ["country", "country"],
  ["companyProfile", "company_profile"],
  ["productCategoryRaw", "product_category_raw"],
];

const empty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

async function main() {
  loadEnv();
  const args = parseArgs();
  const dryRun = Boolean(args["dry-run"]);
  const file = path.resolve(process.cwd(), String(args.file ?? "scripts/leads/out/herbal-client-data.merged.json"));
  if (!fs.existsSync(file)) {
    console.error(`\n  ${file} not found — run \`npm run leads:extract-raw\` first.\n`);
    process.exit(1);
  }
  const merged: NormalizedLead[] = JSON.parse(fs.readFileSync(file, "utf8")).leads;

  const supabase = serviceClient();

  const probe = await supabase.from("leads").select("raw_data, source_files, country_source, phones").limit(1);
  const hasRawColumns = !probe.error;
  if (!hasRawColumns) {
    console.log("\n  Note: raw_data / source_files / country_source don't exist yet — run the updated");
    console.log("  scripts/leads/leads-schema.sql in Supabase, then re-run this to store them too.");
    console.log("  Filling the ordinary fields now.\n");
  }

  // Every existing lead, by email.
  const byEmail = new Map<string, DbRow>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("leads").select(COLUMNS).order("id").range(from, from + 999);
    if (error) {
      console.error(`\n  ${error.message}\n`);
      process.exit(1);
    }
    if (!data?.length) break;
    for (const row of data as unknown as DbRow[]) {
      if (row.email) byEmail.set(row.email.toLowerCase(), row);
      if (row.company_email) byEmail.set(row.company_email.toLowerCase(), row);
    }
    if (data.length < 1000) break;
  }

  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const filled: Record<string, number> = {};
  let unmatched = 0;
  let marketSet = 0;

  for (const lead of merged) {
    const row = lead.email ? byEmail.get(lead.email.toLowerCase()) : undefined;
    if (!row) {
      unmatched++;
      continue;
    }
    const patch: Record<string, unknown> = {};

    for (const [from, col] of FILL) {
      const value = lead[from];
      if (empty(row[col]) && !empty(value)) {
        patch[col] = value;
        filled[col] = (filled[col] ?? 0) + 1;
      }
    }
    if (row.company_name.startsWith("Unknown") && !lead.companyName.startsWith("Unknown")) {
      patch.company_name = lead.companyName;
      filled.company_name = (filled.company_name ?? 0) + 1;
    }

    const phones = lead.phones ?? [];
    if (hasRawColumns) {
      if (phones.length) patch.phones = phones;
      if (lead.rawData) patch.raw_data = lead.rawData;
      if (lead.sourceFiles?.length) patch.source_files = lead.sourceFiles;
      if (lead.country && empty(row.country)) patch.country_source = lead.countrySource ?? null;
    }

    // No `phones` column yet: keep every number in the ordinary phone field.
    // Numbers already on the lead stay exactly as they are; only numbers it
    // doesn't have yet are appended.
    if (!hasRawColumns && phones.length > 0) {
      const current = String((patch.phone as string | undefined) ?? row.phone ?? "");
      const have = new Set(
        [current, row.mobile ?? ""]
          .flatMap((v) => v.split(/[,;/]/))
          .map((v) => v.replace(/\D/g, "").slice(-10))
          .filter((k) => k.length >= 8)
      );
      const missing = phones.filter((ph) => {
        const k = ph.replace(/\D/g, "").slice(-10);
        return k.length >= 8 && !have.has(k);
      });
      if (missing.length) {
        patch.phone = [current.trim(), ...missing].filter(Boolean).join(" / ");
        filled.phone = (filled.phone ?? 0) + 1;
      }
    }

    if (row.market === "unknown") {
      const market = classifyLeadMarket({
        country: (patch.country as string | undefined) ?? row.country,
        email: row.email,
        company_email: row.company_email,
        website: (patch.website as string | undefined) ?? row.website,
      });
      if (market !== "unknown") {
        patch.market = market;
        marketSet++;
      }
    }

    if (Object.keys(patch).length) updates.push({ id: row.id, patch });
  }

  console.log(`\n  ${merged.length} merged records · ${unmatched} not in the database · ${updates.length} leads to update\n`);
  console.log("  Fields that will be filled (were empty):");
  for (const [col, n] of Object.entries(filled).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(6)}  ${col}`);
  }
  console.log(`    ${String(marketSet).padStart(6)}  market (was unknown)`);

  if (dryRun) {
    console.log("\n  --dry-run: nothing written.\n");
    return;
  }

  // Each row gets its own values, so these are individual updates — run
  // 25 at a time.
  let done = 0;
  let failed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < updates.length) {
      const u = updates[cursor++];
      const { error } = await supabase.from("leads").update(u.patch).eq("id", u.id);
      if (error) {
        failed++;
        if (failed <= 3) console.error(`\n  update failed: ${error.message}`);
      } else {
        done++;
      }
      if ((done + failed) % 200 === 0) process.stdout.write(`  updated ${done + failed}/${updates.length}\r`);
    }
  }
  await Promise.all(Array.from({ length: 25 }, worker));

  console.log(`\n\n  Updated ${done} leads${failed ? `, ${failed} failed` : ""}.\n`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
