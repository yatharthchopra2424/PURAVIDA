/**
 * repair-products.ts — snap stored product suggestions onto real names.
 *
 *   npm run leads:repair-products -- --dry-run
 *   npm run leads:repair-products
 *
 * Leads enriched before suggestion-snapping existed can hold near-miss
 * names such as "Curcumin Extract" for "Curcumin 95% Extract". This
 * rewrites each lead's suggestions against the live products table,
 * without re-running (or re-billing) the AI.
 */

import { loadEnv, parseArgs, serviceClient } from "./_env";
import { snapAll } from "./product-match";

async function main() {
  loadEnv();
  const dryRun = Boolean(parseArgs()["dry-run"]);
  const supabase = serviceClient();

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("name")
    .limit(5000);
  if (productError || !products?.length) {
    console.error(`\n  Could not read products: ${productError?.message ?? "none found"}\n`);
    process.exit(1);
  }
  const catalogue = products.map((p) => p.name as string);

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, company_name, suggested_products")
    .not("suggested_products", "eq", "{}")
    .limit(10000);
  if (error) {
    console.error(`\n  Could not read leads: ${error.message}\n`);
    process.exit(1);
  }

  let changed = 0;
  for (const lead of (leads ?? []) as {
    id: string;
    company_name: string;
    suggested_products: string[];
  }[]) {
    const before = lead.suggested_products ?? [];
    const after = snapAll(before, catalogue);
    if (JSON.stringify(before) === JSON.stringify(after)) continue;

    changed++;
    console.log(`  ${lead.company_name}`);
    console.log(`    before  ${before.join(", ")}`);
    console.log(`    after   ${after.join(", ") || "(none)"}`);

    if (!dryRun) {
      const { error: writeError } = await supabase
        .from("leads")
        .update({ suggested_products: after })
        .eq("id", lead.id);
      if (writeError) console.error(`    write failed: ${writeError.message}`);
    }
  }

  console.log(
    `\n  ${changed} lead(s) ${dryRun ? "would change (dry run, nothing written)" : "updated"}.\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
