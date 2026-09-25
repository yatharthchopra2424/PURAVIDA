/**
 * backfill-market.ts — one-off: sets `leads.market` for rows enrichment
 * hasn't reached yet.
 *
 *   npm run leads:backfill-market
 *   npm run leads:backfill-market -- --dry-run
 *
 * enrich-leads.ts sets `market` going forward as part of enrichment, but
 * that only covers rows it has processed. This does the same
 * classification (classifyMarket, from src/lib/leads.ts — the one place
 * "domestic" vs "export" is decided) for every row, using whatever
 * country value already exists:
 *
 *   1. country_verified (AI-corrected, if enrichment has run)
 *   2. country (the raw catalogue/spreadsheet value)
 *   3. a +91 mobile number, when there is no country at all — common in
 *      the spreadsheet-derived batch, where many sheets never had a
 *      country column
 *
 * Anything still ambiguous after that stays 'unknown' rather than
 * guessing — an unclassified lead is just excluded from both the
 * domestic and export audience filters until it is enriched or edited
 * by hand, which is a far smaller mistake than mailing it from the
 * wrong identity.
 */

import { loadEnv, parseArgs, serviceClient } from "./_env";
import { classifyLeadMarket } from "../../src/lib/leads";

const PAGE = 1000;

function marketFromPhone(mobileE164: string | null): "domestic" | null {
  return mobileE164?.startsWith("+91") ? "domestic" : null;
}

async function main() {
  loadEnv();
  const args = parseArgs();
  const dryRun = Boolean(args["dry-run"]);

  const supabase = serviceClient();
  const counts: Record<string, number> = { domestic: 0, export: 0, unknown: 0, unchanged: 0 };

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, country, country_verified, mobile_e164, market, email, company_email, website")
      .order("id")
      .range(from, from + PAGE - 1);

    if (error) {
      console.error(`\n  ${error.message}`);
      if (error.message.includes("does not exist")) {
        console.error("  Run the updated scripts/leads/leads-schema.sql in Supabase first.\n");
      }
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    const updates: { id: string; market: string }[] = [];

    for (const row of data as {
      id: string;
      country: string | null;
      country_verified: string | null;
      mobile_e164: string | null;
      market: string;
      email: string | null;
      company_email: string | null;
      website: string | null;
    }[]) {
      // Only ever fills in leads still marked unknown, so a market set by
      // hand in the lead drawer (or an earlier run) is never overwritten.
      if (row.market !== "unknown") {
        counts.unchanged++;
        continue;
      }
      const byCountry = classifyLeadMarket({
        country: row.country_verified || row.country,
        email: row.email,
        company_email: row.company_email,
        website: row.website,
      });
      const market = byCountry !== "unknown" ? byCountry : marketFromPhone(row.mobile_e164) ?? "unknown";

      if (market === row.market) {
        counts.unchanged++;
        continue;
      }
      counts[market] = (counts[market] ?? 0) + 1;
      updates.push({ id: row.id, market });
    }

    if (!dryRun) {
      for (let i = 0; i < updates.length; i += 200) {
        const chunk = updates.slice(i, i + 200);
        // No bulk "update each row to a different value" in PostgREST —
        // one request per distinct new value in this chunk, grouped, is
        // far cheaper than one request per row.
        const byMarket = new Map<string, string[]>();
        for (const u of chunk) byMarket.set(u.market, [...(byMarket.get(u.market) ?? []), u.id]);
        for (const [market, ids] of byMarket) {
          const { error: updateError } = await supabase.from("leads").update({ market }).in("id", ids);
          if (updateError) {
            console.error(`\n  Update failed: ${updateError.message}\n`);
            process.exit(1);
          }
        }
      }
    }

    process.stdout.write(`  scanned ${from + data.length}\r`);
    if (data.length < PAGE) break;
  }

  console.log(`\n\n  ${dryRun ? "Would set" : "Set"} market:`);
  console.log(`    domestic   ${counts.domestic ?? 0}`);
  console.log(`    export     ${counts.export ?? 0}`);
  console.log(`    unknown    ${counts.unknown ?? 0}`);
  console.log(`    unchanged  ${counts.unchanged}`);
  if (dryRun) console.log("\n  --dry-run: nothing written.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
