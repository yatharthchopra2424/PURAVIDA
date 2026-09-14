/**
 * check-admin-data.ts — run every admin page's data query for real.
 *
 *   npm run admin:data
 *
 * The admin panel is behind a login, so a broken query there surfaces
 * as a blank page or a 500 only once someone signs in and clicks. Every
 * page's server-side fetch is reproduced here against the live database,
 * using the same column lists and filters the pages use, so a renamed
 * column or a missing table is caught from the terminal instead.
 *
 * Read-only: nothing is written.
 */

import { loadEnv, serviceClient } from "./leads/_env";
import {
  applyLeadFilters,
  DEFAULT_LEAD_FILTERS,
  LEAD_TABLE_COLUMNS,
} from "../src/lib/leads";

type Check = { name: string; ok: boolean; detail: string };

const results: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name.padEnd(34)} ${detail}`);
}

async function main() {
  loadEnv();
  const supabase = serviceClient();

  console.log("\n  Admin page data checks\n");

  // ── /x-admin (dashboard) ──────────────────────────────────
  {
    const [products, categories, contacts, unread] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("product_categories").select("id", { count: "exact", head: true }),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
    ]);

    const err =
      products.error ?? categories.error ?? contacts.error ?? unread.error;
    record(
      "dashboard · catalogue counts",
      !err,
      err
        ? err.message
        : `${products.count} products · ${categories.count} categories · ${contacts.count} inquiries (${unread.count} unread)`
    );
  }

  {
    const [leads, aLeads, sending, sent] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("priority", "A"),
      supabase
        .from("email_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "sending"),
      supabase
        .from("email_sends")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent"),
    ]);

    const err = leads.error ?? aLeads.error ?? sending.error ?? sent.error;
    record(
      "dashboard · outreach counts",
      !err,
      err
        ? err.message
        : `${leads.count} leads (${aLeads.count} priority A) · ${sent.count} emails sent · ${sending.count} campaigns sending`
    );
  }

  // ── /x-admin/leads ────────────────────────────────────────
  {
    const { data, count, error } = await applyLeadFilters(
      supabase.from("leads").select(LEAD_TABLE_COLUMNS, { count: "exact" }),
      DEFAULT_LEAD_FILTERS
    ).range(0, 49);

    record(
      "leads · default page",
      !error,
      error ? error.message : `${data?.length ?? 0} rows of ${count} total`
    );

    // Every column the table renders must actually come back, or the
    // cell silently shows "undefined" rather than failing loudly.
    if (data?.[0]) {
      const row = data[0] as unknown as Record<string, unknown>;
      const expected = LEAD_TABLE_COLUMNS.split(",").map((c) => c.trim());
      const missing = expected.filter((c) => !(c in row));
      record(
        "leads · every column present",
        missing.length === 0,
        missing.length ? `missing: ${missing.join(", ")}` : `${expected.length} columns`
      );
    }
  }

  // Each filter path the UI can produce, since a bad operator only
  // fails for the filter that uses it.
  {
    const filterCases: [string, Partial<typeof DEFAULT_LEAD_FILTERS>][] = [
      ["search", { search: "pharma" }],
      ["tags (any)", { tags: ["nutraceutical", "pharma"] }],
      ["tags (all)", { tags: ["nutraceutical"], tagsMatchAll: true }],
      ["segment", { segments: ["Nutraceutical Brand"] }],
      ["priority", { priorities: ["A"] }],
      ["status", { statuses: ["new"] }],
      ["min score", { minScore: 70 }],
      ["has email", { hasEmail: true }],
      ["contactable", { contactable: true }],
      ["sort by company", { sort: "company" as const }],
      ["sort by page", { sort: "page" as const }],
    ];

    for (const [label, patch] of filterCases) {
      const { count, error } = await applyLeadFilters(
        supabase.from("leads").select("id", { count: "exact", head: true }),
        { ...DEFAULT_LEAD_FILTERS, ...patch }
      );
      record(`leads · filter: ${label}`, !error, error ? error.message : `${count} match`);
    }
  }

  // ── /x-admin/campaigns ────────────────────────────────────
  {
    const { data, error } = await supabase
      .from("email_campaigns")
      .select(
        "id, name, subject, status, total_count, sent_count, failed_count, opened_count, clicked_count, created_at, created_by"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    record(
      "campaigns · list",
      !error,
      error ? error.message : `${data?.length ?? 0} campaigns`
    );
  }

  {
    const { error } = await supabase
      .from("email_sends")
      .select(
        "id, lead_id, to_email, to_name, status, error, sent_at, open_count, first_opened_at, click_count, first_clicked_at, unsubscribed_at"
      )
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(5);
    record("campaigns · recipient rows", !error, error ? error.message : "query shape valid");
  }

  {
    const { error } = await supabase.from("email_suppressions").select("email").limit(1);
    record("campaigns · suppression list", !error, error ? error.message : "reachable");
  }

  {
    const { error } = await supabase
      .from("email_templates")
      .select("id, name, subject, body_html")
      .limit(5);
    record("campaigns · saved templates", !error, error ? error.message : "reachable");
  }

  // ── /x-admin/inquiries ────────────────────────────────────
  {
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, name, email, product, quantity, description, cart_items, is_read, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    record(
      "inquiries · list",
      !error,
      error ? error.message : `${data?.length ?? 0} inquiries`
    );
  }

  // ── /x-admin/products and /x-admin/categories ─────────────
  {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, slug, category_id, botanical_name, active_ingredient, description, image_path, quality_badges, is_halal, popularity, product_categories(name, slug)"
      )
      .order("name")
      .limit(25);
    record(
      "products · list with category join",
      !error,
      error ? error.message : `${data?.length ?? 0} products`
    );
  }

  {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("name");
    record(
      "categories · list",
      !error,
      error ? error.message : `${data?.length ?? 0} categories`
    );
  }

  // ── /x-admin/settings ─────────────────────────────────────
  {
    const [total, enriched] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("ai_status", "done"),
    ]);
    const err = total.error ?? enriched.error;
    record(
      "settings · system status",
      !err,
      err ? err.message : `${total.count} leads · ${enriched.count} enriched`
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n  ${results.length - failed.length}/${results.length} checks passed\n`
  );

  if (failed.length) {
    console.log("  Failing:");
    for (const f of failed) console.log(`    ${f.name} — ${f.detail}`);
    console.log("");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
