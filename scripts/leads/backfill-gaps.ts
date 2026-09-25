/**
 * backfill-gaps.ts — fills the two gaps the AI deliberately leaves on
 * thin records, without inventing anything:
 *
 *   npm run leads:backfill-gaps
 *   npm run leads:backfill-gaps -- --dry-run
 *
 *   - tags: a lead with a real segment but no tag gets the tag that
 *     segment implies ("Pharma Formulator" → pharma). "Other" gets none.
 *   - icebreaker: a lead with none gets a plain, truthful line built only
 *     from facts on the record (company, country). Marked with the
 *     `template-icebreaker` data flag so it is never mistaken for one the
 *     AI wrote, and never overwrites an existing icebreaker.
 *
 * `market` is not touched: with no country/domain/phone evidence there is
 * nothing honest to derive it from — set those by hand in the lead drawer.
 */

import { loadEnv, parseArgs, serviceClient } from "./_env";

const SEGMENT_TAG: Record<string, string> = {
  "Nutraceutical Brand": "nutraceutical",
  "Pharma Formulator": "pharma",
  "API & Intermediates": "api-manufacturer",
  "Herbal & Ayurvedic": "herbal-ayurvedic",
  "Cosmetics & Personal Care": "cosmetics",
  "Food & Beverage": "food-beverage",
  "Veterinary": "veterinary",
  "Contract Manufacturer": "contract-manufacturing",
  "Trader & Distributor": "trader-distributor",
  "Excipients & Chemicals": "excipients",
  "Packaging": "packaging",
  "Machinery & Equipment": "machinery",
  "Medical Devices": "medical-devices",
  "Testing & Certification": "testing-lab",
  "Services & Consulting": "services",
  "Logistics": "logistics",
};

interface Row {
  id: string;
  company_name: string;
  country: string | null;
  country_verified: string | null;
  segment: string | null;
  tags: string[] | null;
  icebreaker: string | null;
  data_flags: string[] | null;
}

async function main() {
  loadEnv();
  const dryRun = Boolean(parseArgs()["dry-run"]);
  const supabase = serviceClient();
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  let tagged = 0;
  let iced = 0;

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, company_name, country, country_verified, segment, tags, icebreaker, data_flags")
      .eq("ai_status", "done")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const r of data as Row[]) {
      const patch: Record<string, unknown> = {};

      const implied = r.segment ? SEGMENT_TAG[r.segment] : undefined;
      if ((!r.tags || r.tags.length === 0) && implied) {
        patch.tags = [implied];
        tagged++;
      }

      if (!r.icebreaker?.trim()) {
        const named = r.company_name && !r.company_name.startsWith("Unknown");
        const country = r.country_verified || r.country;
        const who = named ? r.company_name : "your company";
        patch.icebreaker = `I came across ${who}${country ? ` in ${country}` : ""} and thought our herbal extracts and nutraceutical ingredients might be relevant to your work.`;
        patch.data_flags = [...new Set([...(r.data_flags ?? []), "template-icebreaker"])].slice(0, 6);
        iced++;
      }

      if (Object.keys(patch).length) updates.push({ id: r.id, patch });
    }
    if (data.length < 1000) break;
  }

  console.log(`\n  tags to add: ${tagged}   icebreakers to add: ${iced}   leads touched: ${updates.length}`);
  if (dryRun) return console.log("  --dry-run: nothing written.\n");

  let cursor = 0;
  let failed = 0;
  await Promise.all(
    Array.from({ length: 25 }, async () => {
      while (cursor < updates.length) {
        const u = updates[cursor++];
        const { error } = await supabase.from("leads").update(u.patch).eq("id", u.id);
        if (error) failed++;
      }
    })
  );
  console.log(`  Done${failed ? `, ${failed} failed` : ""}.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
