/**
 * enrich-leads.ts — AI cross-verification + outreach insights.
 *
 *   npm run leads:enrich
 *   npm run leads:enrich -- --limit 20            # try a small batch first
 *   npm run leads:enrich -- --concurrency 6
 *   npm run leads:enrich -- --redo failed         # retry only failures
 *   npm run leads:enrich -- --redo all --yes      # re-enrich everything
 *
 * Runs every lead through NVIDIA NIM (Nemotron) and asks it to do the
 * two things a regex parser cannot:
 *
 *   1. Cross-verify — does the email domain match the company? Did the
 *      name/designation split come out sensibly? Which country is this
 *      really, given the PDF spells it "India", "india", "India." and
 *      "ndia"? Disagreements land in `data_flags` rather than silently
 *      overwriting the extracted values.
 *
 *   2. Judge fit and write the opener — a 688-page catalogue is only
 *      useful if it is ranked, so each lead gets an ICP score against
 *      the real PuraVida product catalogue (read live from the
 *      database, not hardcoded), a segment, bulk-selectable tags, and
 *      a one-line icebreaker grounded in that company's own profile.
 *
 * Resumable by design: progress lives in `leads.ai_status`, so an
 * interrupted run is continued simply by running the command again.
 * Cost control: only rows still marked `pending` are sent.
 */

import { loadEnv, parseArgs, requireEnv, serviceClient } from "./_env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { snapAll } from "./product-match";
import { KeyPool } from "./key-pool";

// ── Controlled vocabularies ──────────────────────────────────
// Imported from the app rather than redeclared: the admin panel filters
// on exactly these values, so a label the model invents here would be
// unreachable from the UI.

import {
  LEAD_SEGMENTS as SEGMENTS,
  LEAD_TAGS as TAGS,
  LEAD_SENIORITY as SENIORITY,
  LEAD_RELATIONSHIPS as RELATIONSHIP,
  LEAD_PRIORITIES as PRIORITY,
  classifyLeadMarket,
} from "../../src/lib/leads";

// ── Model I/O ────────────────────────────────────────────────

interface Enrichment {
  segment: string;
  tags: string[];
  icp_score: number;
  priority: string;
  relationship: string;
  seniority: string;
  ai_summary: string;
  pitch_angle: string;
  icebreaker: string;
  suggested_products: string[];
  data_flags: string[];
  city: string | null;
  state: string | null;
  country: string | null;
}

const RESPONSE_SHAPE = `{
  "segment": "<exactly one of the SEGMENTS list>",
  "tags": ["<zero or more of the TAGS list, most specific first, max 6>"],
  "icp_score": <integer 0-100>,
  "priority": "<A|B|C|D>",
  "relationship": "<buyer|supplier|both|not_relevant>",
  "seniority": "<owner|c_level|director|manager|staff|unknown>",
  "ai_summary": "<max 240 chars: what this company actually does, plainly>",
  "pitch_angle": "<max 240 chars: the specific reason PuraVida should contact them, or why not>",
  "icebreaker": "<max 200 chars: one opening line for a cold email, referencing something concrete from THIS company's profile. No greeting, no signature.>",
  "suggested_products": ["<0-4 items, copied verbatim from the PuraVida catalogue list>"],
  "data_flags": ["<0-5 short kebab-case flags, see below>"],
  "city": "<corrected city or null>",
  "state": "<corrected state/province or null>",
  "country": "<corrected country in canonical English, e.g. \\"India\\", or null>"
}`;

function buildSystemPrompt(catalogue: string): string {
  return `You are a B2B lead-qualification analyst for PuraVida Natural, an Indian manufacturer and exporter of botanical ingredients.

WHAT PURAVIDA SELLS (bulk B2B ingredients, not finished consumer products):
${catalogue}

WHO IS A GOOD FIT
PuraVida sells ingredients TO companies that formulate or brand finished products. Rank accordingly:
- 80-100 (priority A): nutraceutical / dietary supplement brands, herbal & ayurvedic formulators, cosmetics & personal-care makers, functional food & beverage companies. They buy extracts, oils and powders by the drum.
- 55-79 (priority B): pharma formulators with herbal or OTC lines, veterinary feed/supplement makers, contract manufacturers, ingredient traders and distributors who resell botanicals.
- 25-54 (priority C): general pharma formulators with no botanical line, excipient and chemical suppliers, companies whose profile is too vague to judge but who are plausibly in the supply chain.
- 0-24 (priority D): packaging, machinery and equipment, software and IT, logistics, testing labs, consultancies, medical devices. They will never buy a botanical extract.

RELATIONSHIP
- "buyer"        — they would purchase ingredients from PuraVida.
- "supplier"     — they make the same botanical extracts/oils PuraVida makes (a competitor, or a possible sourcing partner).
- "both"         — a trader or manufacturer who could buy and sell.
- "not_relevant" — neither.
A company can score low on icp_score and still be "supplier"; the two are independent judgements.

CROSS-VERIFICATION
The source data was parsed out of a PDF and may be wrong. Report problems in data_flags using ONLY these values:
- "email-domain-mismatch"  — the email domain has no plausible relation to the company name (ignore gmail/yahoo/rediff/outlook; flag those as "personal-email-domain" instead).
- "personal-email-domain"  — a free mail provider rather than a company domain.
- "name-looks-malformed"   — the contact name is empty, a fragment, or clearly a parsing artefact.
- "designation-not-decision-maker" — the named contact is unlikely to influence an ingredient purchase (e.g. graphic designer, receptionist).
- "profile-missing"        — no usable company profile text was supplied.
- "location-corrected"     — you changed city/state/country from what was supplied.
- "possible-duplicate-contact" — the profile suggests this is a second contact at a company already listed.
Do not invent other flags.

LOCATION
Return canonical city/state/country. Fix obvious PDF damage ("ndia" -> "India", "India." -> "India", "india" -> "India"). If a value is genuinely unknown, return null — do not guess.

ICEBREAKER
One sentence a salesperson could paste into a cold email. It must reference something specific this company said about itself. Never mention the trade-show catalogue, never say "I came across your profile", never use exclamation marks.

SUGGESTED PRODUCTS
Copy names verbatim from the PuraVida catalogue above. If the company would not buy any of them, return an empty array.

SEGMENTS (choose exactly one):
${SEGMENTS.join(", ")}

TAGS (choose zero or more):
${TAGS.join(", ")}

Reply with a single JSON object and nothing else — no markdown fence, no commentary:
${RESPONSE_SHAPE}`;
}

interface LeadRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  designation: string | null;
  email: string | null;
  company_email: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  address: string | null;
  company_profile: string | null;
  product_categories: string[] | null;
  product_category_raw: string | null;
  parse_warnings: string[] | null;
}

function buildUserPrompt(lead: LeadRow): string {
  // The molecule list can run to 3 000+ characters; the first slice is
  // enough to tell what they make and keeps the token bill sane.
  const categories = (lead.product_category_raw ?? "").slice(0, 900);

  return [
    `Company: ${lead.company_name}`,
    `Contact: ${lead.contact_name ?? "(none parsed)"}`,
    `Designation: ${lead.designation ?? "(none)"}`,
    `Contact email: ${lead.email ?? "(none)"}`,
    `Company email: ${lead.company_email ?? "(none)"}`,
    `Website: ${lead.website ?? "(none)"}`,
    `Postal address: ${lead.address?.slice(0, 300) ?? "(none)"}`,
    `Location as parsed: city=${lead.city ?? "?"} state=${lead.state ?? "?"} country=${lead.country ?? "?"}`,
    `Declared product categories: ${categories || "(none)"}`,
    `Parser warnings: ${(lead.parse_warnings ?? []).join(", ") || "(none)"}`,
    ``,
    `Notes on the company (catalogue profile, or our own sales notes):`,
    lead.company_profile?.slice(0, 2500) ?? "(no profile text)",
  ].join("\n");
}

// ── Response handling ────────────────────────────────────────

/**
 * Models wrap JSON in prose or a fence often enough that trusting
 * `JSON.parse` on the raw string loses usable answers. Falls back to
 * the outermost brace pair.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON object in response");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function pick<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number] | null
): T[number] | null {
  if (typeof value !== "string") return fallback;
  const match = allowed.find((a) => a.toLowerCase() === value.trim().toLowerCase());
  return match ?? fallback;
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed.slice(0, max);
}

/** Coerces the model's answer into something the schema will accept. */
function validate(raw: unknown): Enrichment {
  if (typeof raw !== "object" || raw === null) throw new Error("response was not an object");
  const r = raw as Record<string, unknown>;

  const score = Number(r.icp_score);
  const icp = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;

  // Derive priority from the score when the model's band disagrees with
  // its own number — the score is the value the admin sorts on, so the
  // two must not tell different stories.
  const scoreBand = icp >= 80 ? "A" : icp >= 55 ? "B" : icp >= 25 ? "C" : "D";

  const tags = Array.isArray(r.tags)
    ? [...new Set(
        r.tags
          .map((t) => pick(t, TAGS, null))
          .filter((t): t is (typeof TAGS)[number] => t !== null)
      )].slice(0, 6)
    : [];

  const suggested = Array.isArray(r.suggested_products)
    ? r.suggested_products
        .map((p) => cleanString(p, 120))
        .filter((p): p is string => p !== null)
        .slice(0, 4)
    : [];

  const flags = Array.isArray(r.data_flags)
    ? r.data_flags
        .map((f) => cleanString(f, 60))
        .filter((f): f is string => f !== null)
        .slice(0, 5)
    : [];

  return {
    segment: pick(r.segment, SEGMENTS, "Other")!,
    tags,
    icp_score: icp,
    priority: pick(r.priority, PRIORITY, scoreBand) ?? scoreBand,
    relationship: pick(r.relationship, RELATIONSHIP, "not_relevant")!,
    seniority: pick(r.seniority, SENIORITY, "unknown")!,
    ai_summary: cleanString(r.ai_summary, 400) ?? "",
    pitch_angle: cleanString(r.pitch_angle, 400) ?? "",
    icebreaker: cleanString(r.icebreaker, 300) ?? "",
    suggested_products: suggested,
    data_flags: flags,
    city: cleanString(r.city, 80),
    state: cleanString(r.state, 80),
    country: cleanString(r.country, 80),
  };
}

// ── Catalogue context ────────────────────────────────────────

const FALLBACK_CATALOGUE = `Categories: Herbal Extracts, Essential Oils, Oleoresins, Fruit Juice Powders, Phytochemicals, Amino Acids, Nutraceuticals.
Representative products: Ashwagandha Extract, Curcumin 95% Extract, Green Tea Extract, Boswellia Extract, Moringa Leaf Extract, Peppermint Oil, Tea Tree Oil, Turmeric Oleoresin, Black Pepper Oleoresin, Amla Powder, Piperine 95%, Quercetin Extract.`;

/**
 * Reads the live catalogue so product suggestions stay correct as the
 * product table changes. Falls back to a static list rather than
 * failing the whole run.
 */
async function loadCatalogue(
  supabase: SupabaseClient
): Promise<{ prompt: string; productNames: string[] }> {
  const [{ data: categories }, { data: products }] = await Promise.all([
    // The table is `product_categories`, not `categories` — the latter
    // does not exist, so querying it returned no rows and silently fell
    // back to the static summary below, scoring every lead against a
    // hardcoded list instead of the live 256-product catalogue.
    supabase.from("product_categories").select("name").order("name"),
    // The whole catalogue, not the top 120: a product the model never
    // sees is a product it can never suggest, however well it fits.
    supabase.from("products").select("name").order("popularity", { ascending: false }).limit(1000),
  ]);

  if (!categories?.length || !products?.length) {
    console.log("  (using the built-in catalogue summary — product tables unreadable)");
    return { prompt: FALLBACK_CATALOGUE, productNames: [] };
  }

  return {
    prompt: [
      `Categories: ${categories.map((c) => c.name).join(", ")}.`,
      `Products (${products.length}): ${products.map((p) => p.name).join(", ")}.`,
    ].join("\n"),
    productNames: products.map((p) => p.name as string),
  };
}

// ── Runner ───────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Nemotron is a reasoning model: it thinks in `reasoning_content` and
 * answers in `content`, and BOTH are billed against max_tokens. A
 * budget sized for the answer alone is spent on the thinking, the
 * answer is truncated mid-object, and every row fails with what looks
 * like a parsing bug. 3000 leaves room for roughly 1500 tokens of
 * reasoning plus the ~800-token answer.
 */
const DEFAULT_MAX_TOKENS = 3000;

async function enrichOne(
  pool: KeyPool,
  model: string,
  systemPrompt: string,
  lead: LeadRow,
  maxTokens: number
): Promise<Enrichment> {
  let lastError: unknown;
  // Keys this lead has already been refused by, so the retry goes to a
  // different one instead of queueing behind the same throttled key.
  const avoid = new Set<number>();

  // A 429 no longer means "sleep and hope": the pool already keeps every
  // key under its per-minute limit, so a 429 that still happens marks
  // that key as cooling and this lead simply moves to another key.
  for (let attempt = 1; attempt <= 25; attempt++) {
    const slot = await pool.acquire(avoid);
    try {
      const completion = await slot.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildUserPrompt(lead) },
        ],
        // Constrained decoding. The prompt asks for bare JSON too, but
        // a reasoning model will happily narrate its way into the
        // answer; this makes that impossible rather than unlikely.
        response_format: { type: "json_object" },
        // Low but not zero: classification should be stable, while the
        // icebreaker still needs to read like a sentence a person wrote.
        temperature: 0.3,
        top_p: 1,
        max_tokens: maxTokens,
        stream: false,
      });

      const choice = completion.choices[0];

      // Naming this case is the difference between "the model is
      // broken" and "raise --max-tokens", which are very different
      // things to be told at 3am with 600 rows queued.
      if (choice?.finish_reason === "length") {
        pool.success(slot.index);
        throw new Error(
          `response truncated at max_tokens=${maxTokens} (reasoning consumed the budget) — re-run with --max-tokens ${maxTokens * 2}`
        );
      }

      const text = choice?.message?.content;
      if (!text) throw new Error("empty response");
      const result = validate(extractJson(text));
      pool.success(slot.index);
      return result;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number }).status;

      if (status === 429 || /^429\b/.test(message) || /too many requests/i.test(message)) {
        pool.rateLimited(slot.index);
        avoid.add(slot.index);
        continue; // straight to another key, no sleep
      }
      if (status === 401 || status === 403 || /^40[13]\b/.test(message)) {
        if (pool.dead(slot.index)) {
          console.log(`\n  ${slot.label} was rejected (${status ?? message.slice(0, 3)}) — dropping it for this run.`);
        }
        avoid.add(slot.index);
        continue;
      }

      pool.failure(slot.index);
      if (attempt < 25) await sleep(Math.min(1000 * attempt, 5000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  loadEnv();
  const args = parseArgs();

  // NVIDIA's per-key rate limit (40 requests/minute) is the real ceiling
  // on throughput, so keys (NVIDIA_API_KEY, NVIDIA_API_KEY_2 … _8) are
  // pooled: each request takes whichever key has headroom at that moment
  // (see key-pool.ts), rather than being pinned to one. Identical values
  // pasted under two names count once.
  const seen = new Set<string>();
  const keyEntries: { label: string; apiKey: string }[] = [];
  for (let n = 1; n <= 8; n++) {
    const label = n === 1 ? "NVIDIA_API_KEY" : `NVIDIA_API_KEY_${n}`;
    const apiKey = process.env[label]?.trim();
    if (apiKey && !seen.has(apiKey)) {
      seen.add(apiKey);
      keyEntries.push({ label, apiKey });
    }
  }
  if (keyEntries.length === 0) requireEnv("NVIDIA_API_KEY"); // exits with the usual message
  const model = process.env.NVIDIA_MODEL?.trim() || "nvidia/nemotron-3-super-120b-a12b";
  const baseURL =
    process.env.NVIDIA_BASE_URL?.trim() || "https://integrate.api.nvidia.com/v1";

  const limit = args.limit ? Number(args.limit) : Infinity;
  const rpm = Math.max(1, Number(args.rpm ?? 40));
  const pool = new KeyPool(keyEntries, baseURL, rpm);
  // Workers only need to be numerous enough to keep every key's window
  // full: at ~1 minute per reasoning-model call, holding 38 requests/min
  // on a key takes roughly that many calls in flight. The pool, not this
  // number, is what enforces the limit.
  const workersPerKey = Math.max(1, Number(args["workers-per-key"] ?? 10));
  const maxTokens = Math.max(
    800,
    Number(args["max-tokens"] ?? DEFAULT_MAX_TOKENS)
  );
  const redo = typeof args.redo === "string" ? args.redo : null;

  const supabase = serviceClient();

  // `market` was added after this script first shipped; a database that
  // hasn't had the updated leads-schema.sql run yet doesn't have the
  // column. Checked once up front rather than letting every single row
  // fail its write and land in `failed` over something that isn't
  // actually about that lead.
  const hasMarketColumn = await (async () => {
    const { error } = await supabase.from("leads").select("market").limit(1);
    return !error;
  })();
  if (!hasMarketColumn) {
    console.log(
      "\n  Note: `leads.market` does not exist yet (run the updated leads-schema.sql in Supabase) — enriching without it for now.\n"
    );
  }

  // `--redo-model <substring>` re-queues only rows enriched by a model
  // whose name contains it (e.g. `nano`), leaving the rest untouched.
  if (typeof args["redo-model"] === "string") {
    const { error, count } = await supabase
      .from("leads")
      .update({ ai_status: "pending", ai_error: null }, { count: "exact" })
      .eq("ai_status", "done")
      .ilike("ai_model", `%${args["redo-model"]}%`);
    if (error) {
      console.error(`  Could not reset: ${error.message}`);
      process.exit(1);
    }
    console.log(`\n  Re-queued ${count ?? 0} leads enriched by *${args["redo-model"]}*.`);
  }

  // `--redo` re-queues already-processed rows. Re-running the whole
  // catalogue costs real money, so "all" asks before it does that.
  if (redo) {
    const target = redo === "all" ? ["done", "failed", "skipped"] : [redo];
    if (redo === "all" && !args.yes) {
      console.error(
        "\n  --redo all re-enriches every lead and bills for all of them.\n" +
          "  Add --yes if that is what you want.\n"
      );
      process.exit(1);
    }
    const { error, count } = await supabase
      .from("leads")
      .update({ ai_status: "pending", ai_error: null }, { count: "exact" })
      .in("ai_status", target);
    if (error) {
      console.error(`  Could not reset: ${error.message}`);
      process.exit(1);
    }
    console.log(`\n  Re-queued ${count ?? 0} leads (${target.join(", ")}).`);
  }

  const catalogue = await loadCatalogue(supabase);
  const systemPrompt = buildSystemPrompt(catalogue.prompt);
  // The API returns at most 1000 rows per request, so page until the
  // limit (or the end). Ordered by profile then id so paging is stable.
  const pending: unknown[] = [];
  let error: { message: string } | null = null;
  const want = Number.isFinite(limit) ? limit : 100000;
  for (let from = 0; pending.length < want; from += 1000) {
    const page = await supabase
      .from("leads")
      .select(
        "id, company_name, contact_name, designation, email, company_email, city, state, country, website, address, company_profile, product_categories, product_category_raw, parse_warnings"
      )
      .eq("ai_status", "pending")
      // Cheapest wins first: a lead with profile text is worth more than
      // one without, and a truncated run should have done the good ones.
      .order("company_profile", { ascending: false, nullsFirst: false })
      .order("id")
      .range(from, from + 999);
    if (page.error) {
      error = page.error;
      break;
    }
    pending.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 1000) break;
  }
  pending.length = Math.min(pending.length, want);

  if (error) {
    console.error(`\n  Could not read leads: ${error.message}`);
    if (error.message.includes("does not exist")) {
      console.error("  Run scripts/leads/leads-schema.sql in Supabase first.\n");
    }
    process.exit(1);
  }

  const leads = (pending ?? []) as LeadRow[];
  if (leads.length === 0) {
    console.log("\n  Nothing pending. Use --redo failed to retry failures.\n");
    return;
  }

  console.log(`\n  Model        ${model}`);
  console.log(`  Pending      ${leads.length} leads`);
  console.log(`  Keys         ${pool.size} (${keyEntries.map((k) => k.label).join(", ")})`);
  console.log(
    `  Rate limit   ${rpm}/min per key → up to ${pool.capacityPerMinute}/min pooled, ${workersPerKey * pool.size} workers\n`
  );

  // `--compare N --vs <model>`: run the first N pending leads through the
  // current model and a second one, print how they differ, write nothing.
  if (args.compare) {
    const n = Math.min(Number(args.compare) || 30, leads.length);
    const vs = String(args.vs ?? "nvidia/nemotron-3-super-120b-a12b");
    const sample = leads.slice(0, n);
    const t = async (m: string) => {
      const t0 = Date.now();
      const out = await Promise.all(
        sample.map((l) => enrichOne(pool, m, systemPrompt, l, maxTokens).then((r) => r, () => null))
      );
      return { out, secs: (Date.now() - t0) / 1000 };
    };
    console.log(`  Comparing ${model} vs ${vs} on ${n} leads (nothing is saved)…\n`);
    const [a, b] = [await t(model), await t(vs)];
    const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
    const stats = { both: 0, segment: 0, tags: 0, priority: 0, country: 0, icpClose: 0, products: 0 };
    sample.forEach((l, i) => {
      const x = a.out[i], y = b.out[i];
      if (!x || !y) return;
      stats.both++;
      if (x.segment === y.segment) stats.segment++;
      if (same([...x.tags].sort(), [...y.tags].sort())) stats.tags++;
      if (x.priority === y.priority) stats.priority++;
      if ((x.country ?? "") === (y.country ?? "")) stats.country++;
      if (Math.abs(x.icp_score - y.icp_score) <= 1) stats.icpClose++;
      if (same([...x.suggested_products].sort(), [...y.suggested_products].sort())) stats.products++;
      if (x.segment !== y.segment || (x.country ?? "") !== (y.country ?? "")) {
        console.log(`  ${l.company_name}\n    A: ${x.segment} | ${x.country} | ${x.tags.join(",")}\n    B: ${y.segment} | ${y.country} | ${y.tags.join(",")}`);
      }
    });
    const pct = (v: number) => `${Math.round((v / Math.max(stats.both, 1)) * 100)}%`;
    console.log(`\n  Leads both models answered: ${stats.both}/${n}   (A ok ${a.out.filter(Boolean).length}, B ok ${b.out.filter(Boolean).length})`);
    console.log(`  Time: A ${a.secs.toFixed(0)}s   B ${b.secs.toFixed(0)}s`);
    console.log(`  Agree — segment ${pct(stats.segment)} · tags ${pct(stats.tags)} · priority ${pct(stats.priority)} · country ${pct(stats.country)} · icp±1 ${pct(stats.icpClose)} · products ${pct(stats.products)}\n`);
    return;
  }

  let done = 0;
  let failed = 0;
  // Rows the model classified but for which every tag it chose was
  // outside the allowed list. Those rows end up untaggable in the admin
  // filters, which is worth knowing about as a number rather than
  // discovering one empty filter at a time.
  let untagged = 0;
  const started = Date.now();

  // A fixed pool of workers pulling from one cursor: simpler than
  // batching, and one slow response cannot stall the others.
  let cursor = 0;
  async function worker() {
    while (cursor < leads.length) {
      const lead = leads[cursor++];

      try {
        const result = await enrichOne(pool, model, systemPrompt, lead, maxTokens);

        const flags = new Set(result.data_flags);
        if (
          result.country &&
          lead.country &&
          result.country.toLowerCase() !== lead.country.toLowerCase()
        ) {
          flags.add("location-corrected");
        }

        const { error: writeError } = await supabase
          .from("leads")
          .update({
            ai_status: "done",
            ai_model: model,
            ai_error: null,
            ai_enriched_at: new Date().toISOString(),
            segment: result.segment,
            tags: result.tags,
            icp_score: result.icp_score,
            priority: result.priority,
            relationship: result.relationship,
            seniority: result.seniority,
            ai_summary: result.ai_summary,
            pitch_angle: result.pitch_angle,
            icebreaker: result.icebreaker,
            // Only names the website actually lists. The model is asked
            // to copy verbatim and usually does; the rest are snapped to
            // the closest real product or dropped.
            suggested_products: catalogue.productNames.length
              ? snapAll(result.suggested_products, catalogue.productNames)
              : result.suggested_products,
            data_flags: [...flags].slice(0, 6),
            city_verified: result.city,
            state_verified: result.state,
            country_verified: result.country,
            // Domestic (India) vs export, derived from whichever country
            // is freshest — the AI's corrected value beats the raw one.
            ...(hasMarketColumn
              ? {
                  market: classifyLeadMarket({
                    country: result.country || lead.country,
                    email: lead.email,
                    company_email: lead.company_email,
                    website: lead.website,
                  }),
                }
              : {}),
            ai_raw: result as unknown as Record<string, unknown>,
          })
          .eq("id", lead.id);

        if (writeError) throw new Error(`db: ${writeError.message}`);
        if (result.tags.length === 0) untagged++;
        done++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        await supabase
          .from("leads")
          .update({
            ai_status: "failed",
            ai_error: message.slice(0, 500),
            ai_model: model,
          })
          .eq("id", lead.id);
      }

      const finished = done + failed;
      if (finished % 10 === 0 || finished === leads.length) {
        const rate = finished / ((Date.now() - started) / 1000);
        const left = Math.round((leads.length - finished) / Math.max(rate, 0.01));
        process.stdout.write(
          `  ${finished}/${leads.length}  ok=${done} failed=${failed}  ~${left}s left      \r`
        );
      }
    }
  }

  // A shared pool of workers, none tied to a key — each request asks the
  // pool for a key at the moment it sends, so a key that cools down or
  // dies just stops being picked and the others absorb its share.
  const workers = Array.from(
    { length: Math.min(leads.length, workersPerKey * pool.size) },
    () => worker()
  );
  await Promise.all(workers);
  console.log(`\n\n  Per key:\n  ${pool.report()}`);

  console.log(`\n\n  Enriched ${done}, failed ${failed}.`);

  if (untagged > 0) {
    console.log(
      `  ${untagged} got no usable tag — reachable in the admin by segment\n` +
        `  and score, but not by the tag chips.`
    );
  }

  if (failed) {
    console.log("  Retry the failures with:  npm run leads:enrich -- --redo failed");
  }

  const { data: summary } = await supabase
    .from("leads")
    .select("priority")
    .eq("ai_status", "done");

  if (summary?.length) {
    const counts = summary.reduce<Record<string, number>>((acc, row) => {
      const key = (row as { priority: string | null }).priority ?? "?";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `\n  Priority split  ${["A", "B", "C", "D"]
        .map((p) => `${p}:${counts[p] ?? 0}`)
        .join("  ")}`
    );
  }

  console.log(`\n  Open /x-admin/leads to work the list.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
