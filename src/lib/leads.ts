/**
 * Shared vocabulary and filter logic for the lead database.
 *
 * Both the admin table and the campaign-audience builder filter the
 * same rows. If they each wrote their own query, "select all 214
 * matching" could quietly mean something different from what the table
 * just showed — and the difference would only surface as emails sent to
 * the wrong people. `applyLeadFilters` is therefore the single place a
 * lead filter is expressed, and both callers go through it.
 *
 * scripts/leads/enrich-leads.ts imports the vocabularies from here too,
 * so the values the AI is allowed to produce and the values the admin
 * can filter on cannot drift apart.
 */

// ── Controlled vocabularies ──────────────────────────────────

export const LEAD_SEGMENTS = [
  "Nutraceutical Brand",
  "Pharma Formulator",
  "API & Intermediates",
  "Herbal & Ayurvedic",
  "Cosmetics & Personal Care",
  "Food & Beverage",
  "Veterinary",
  "Contract Manufacturer",
  "Trader & Distributor",
  "Excipients & Chemicals",
  "Packaging",
  "Machinery & Equipment",
  "Medical Devices",
  "Testing & Certification",
  "Services & Consulting",
  "Logistics",
  "Other",
] as const;

export const LEAD_TAGS = [
  "pharma",
  "nutraceutical",
  "herbal-ayurvedic",
  "api-manufacturer",
  "formulations",
  "cosmetics",
  "food-beverage",
  "veterinary",
  "excipients",
  "medical-devices",
  "packaging",
  "machinery",
  "contract-manufacturing",
  "trader-distributor",
  "exporter",
  "importer",
  "services",
  "software-it",
  "logistics",
  "testing-lab",
  "homeopathy",
  "extract-buyer",
  "competitor",
] as const;

export const LEAD_PRIORITIES = ["A", "B", "C", "D"] as const;
export const LEAD_RELATIONSHIPS = ["buyer", "supplier", "both", "not_relevant"] as const;
export const LEAD_SENIORITY = ["owner", "c_level", "director", "manager", "staff", "unknown"] as const;
export const LEAD_STATUSES = [
  "new",
  "queued",
  "contacted",
  "replied",
  "qualified",
  "won",
  "lost",
  "do_not_contact",
] as const;
export const LEAD_AI_STATUSES = ["pending", "done", "failed", "skipped"] as const;

export type LeadTag = (typeof LEAD_TAGS)[number];
export type LeadSegment = (typeof LEAD_SEGMENTS)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Human labels for the filter chips. */
export const TAG_LABELS: Record<string, string> = {
  pharma: "Pharma",
  nutraceutical: "Nutraceutical",
  "herbal-ayurvedic": "Herbal / Ayurvedic",
  "api-manufacturer": "API Maker",
  formulations: "Formulations",
  cosmetics: "Cosmetics",
  "food-beverage": "Food & Beverage",
  veterinary: "Veterinary",
  excipients: "Excipients",
  "medical-devices": "Medical Devices",
  packaging: "Packaging",
  machinery: "Machinery",
  "contract-manufacturing": "Contract Mfg",
  "trader-distributor": "Trader",
  exporter: "Exporter",
  importer: "Importer",
  services: "Services",
  "software-it": "Software / IT",
  logistics: "Logistics",
  "testing-lab": "Testing Lab",
  homeopathy: "Homeopathy",
  "extract-buyer": "Extract Buyer",
  competitor: "Competitor",
};

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  queued: "Queued",
  contacted: "Contacted",
  replied: "Replied",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
  do_not_contact: "Do not contact",
};

// ── Row shape ────────────────────────────────────────────────

/** Columns the admin table reads. Deliberately narrower than `SELECT *`. */
export const LEAD_TABLE_COLUMNS =
  "id, source, source_page, company_name, contact_name, salutation, designation, " +
  "email, company_email, mobile, mobile_e164, website, city, state, country, " +
  "city_verified, state_verified, country_verified, hall_no, stall_no, " +
  "product_categories, segment, tags, icp_score, priority, relationship, seniority, " +
  "ai_status, ai_summary, pitch_angle, icebreaker, suggested_products, data_flags, " +
  "company_profile, status, notes, last_contacted_at, is_suppressed, created_at";

export interface Lead {
  id: string;
  source: string;
  source_page: number | null;
  company_name: string;
  contact_name: string | null;
  salutation: string | null;
  designation: string | null;
  email: string | null;
  company_email: string | null;
  mobile: string | null;
  mobile_e164: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  city_verified: string | null;
  state_verified: string | null;
  country_verified: string | null;
  hall_no: string | null;
  stall_no: string | null;
  product_categories: string[] | null;
  segment: string | null;
  tags: string[] | null;
  icp_score: number | null;
  priority: string | null;
  relationship: string | null;
  seniority: string | null;
  ai_status: string;
  ai_summary: string | null;
  pitch_angle: string | null;
  icebreaker: string | null;
  suggested_products: string[] | null;
  data_flags: string[] | null;
  company_profile: string | null;
  status: string;
  notes: string | null;
  last_contacted_at: string | null;
  is_suppressed: boolean;
  created_at: string;
}

/** The email an outbound campaign would actually use for this lead. */
export function primaryEmail(lead: Pick<Lead, "email" | "company_email">): string | null {
  return lead.email ?? lead.company_email ?? null;
}

export function displayLocation(lead: Lead): string {
  const city = lead.city_verified ?? lead.city;
  const country = lead.country_verified ?? lead.country;
  return [city, country].filter(Boolean).join(", ");
}

// ── Filters ──────────────────────────────────────────────────

export interface LeadFilters {
  search: string;
  tags: string[];
  /** Match leads carrying ALL selected tags rather than any of them. */
  tagsMatchAll: boolean;
  segments: string[];
  priorities: string[];
  statuses: string[];
  relationships: string[];
  source: string | null;
  minScore: number | null;
  /** Only leads that have a usable address — the default for campaigns. */
  hasEmail: boolean;
  /** Exclude unsubscribed / bounced / do-not-contact rows. */
  contactable: boolean;
  sort: "score" | "company" | "recent" | "page";
}

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  search: "",
  tags: [],
  tagsMatchAll: false,
  segments: [],
  priorities: [],
  statuses: [],
  relationships: [],
  source: null,
  minScore: null,
  hasEmail: false,
  contactable: false,
  sort: "score",
};

function csv(value: string | null, allowed: readonly string[]): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => allowed.includes(v));
}

/** Reads filters out of a query string, dropping anything unrecognised. */
export function parseLeadFilters(params: URLSearchParams): LeadFilters {
  const rawScore = Number.parseInt(params.get("minScore") ?? "", 10);

  const sort = params.get("sort");
  return {
    search: (params.get("search") ?? "").trim().slice(0, 120),
    tags: csv(params.get("tags"), LEAD_TAGS),
    tagsMatchAll: params.get("tagsMatchAll") === "1",
    segments: csv(params.get("segments"), LEAD_SEGMENTS),
    priorities: csv(params.get("priorities"), LEAD_PRIORITIES),
    statuses: csv(params.get("statuses"), LEAD_STATUSES),
    relationships: csv(params.get("relationships"), LEAD_RELATIONSHIPS),
    source: params.get("source")?.trim().slice(0, 60) || null,
    minScore: Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : null,
    hasEmail: params.get("hasEmail") === "1",
    contactable: params.get("contactable") === "1",
    sort:
      sort === "company" || sort === "recent" || sort === "page" ? sort : "score",
  };
}

/** Serialises filters back into a query string, omitting defaults. */
export function serializeLeadFilters(filters: LeadFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.tags.length) params.set("tags", filters.tags.join(","));
  if (filters.tagsMatchAll) params.set("tagsMatchAll", "1");
  if (filters.segments.length) params.set("segments", filters.segments.join(","));
  if (filters.priorities.length) params.set("priorities", filters.priorities.join(","));
  if (filters.statuses.length) params.set("statuses", filters.statuses.join(","));
  if (filters.relationships.length)
    params.set("relationships", filters.relationships.join(","));
  if (filters.source) params.set("source", filters.source);
  if (filters.minScore !== null) params.set("minScore", String(filters.minScore));
  if (filters.hasEmail) params.set("hasEmail", "1");
  if (filters.contactable) params.set("contactable", "1");
  if (filters.sort !== "score") params.set("sort", filters.sort);
  return params;
}

/**
 * The subset of the PostgREST builder these filters touch.
 *
 * Structural rather than imported: the real builder type is generic
 * over the row shape, so naming it here would force every caller to
 * thread its type parameters through for no benefit, and would couple
 * this module to a `@supabase/postgrest-js` internal path.
 */
interface FilterableQuery {
  or(filter: string): FilterableQuery;
  in(column: string, values: readonly string[]): FilterableQuery;
  eq(column: string, value: unknown): FilterableQuery;
  neq(column: string, value: unknown): FilterableQuery;
  gte(column: string, value: unknown): FilterableQuery;
  contains(column: string, value: readonly string[]): FilterableQuery;
  overlaps(column: string, value: readonly string[]): FilterableQuery;
  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean }
  ): FilterableQuery;
}

/**
 * Applies a filter set to a `leads` query.
 *
 * Ordering is applied too, so a paged list and a "select everything
 * that matches" both walk the rows in the same sequence.
 */
export function applyLeadFilters<Q>(query: Q, filters: LeadFilters): Q {
  let q = query as unknown as FilterableQuery;

  if (filters.search) {
    // Escape PostgREST's LIKE wildcards so a literal % in the search box
    // does not match every row, and its comma/parenthesis separators so
    // a search for "a,b" cannot inject an extra OR term.
    const escaped = filters.search
      .replace(/[%_\\]/g, (char) => `\\${char}`)
      .replace(/[(),]/g, " ");
    q = q.or(
      [
        `company_name.ilike.%${escaped}%`,
        `contact_name.ilike.%${escaped}%`,
        `email.ilike.%${escaped}%`,
        `company_email.ilike.%${escaped}%`,
      ].join(",")
    );
  }

  if (filters.tags.length) {
    q = filters.tagsMatchAll
      ? q.contains("tags", filters.tags)
      : q.overlaps("tags", filters.tags);
  }

  if (filters.segments.length) q = q.in("segment", filters.segments);
  if (filters.priorities.length) q = q.in("priority", filters.priorities);
  if (filters.statuses.length) q = q.in("status", filters.statuses);
  if (filters.relationships.length) q = q.in("relationship", filters.relationships);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.minScore !== null) q = q.gte("icp_score", filters.minScore);

  if (filters.hasEmail) {
    q = q.or("email.not.is.null,company_email.not.is.null");
  }

  if (filters.contactable) {
    q = q.eq("is_suppressed", false).neq("status", "do_not_contact");
  }

  switch (filters.sort) {
    case "company":
      q = q.order("company_name", { ascending: true });
      break;
    case "recent":
      q = q.order("created_at", { ascending: false });
      break;
    case "page":
      q = q.order("source_page", { ascending: true, nullsFirst: false });
      break;
    default:
      q = q
        .order("icp_score", { ascending: false, nullsFirst: false })
        .order("company_name", { ascending: true });
  }

  // A deterministic tiebreak. Without it, two rows with the same score
  // can swap places between pages and a lead is shown twice or missed.
  q = q.order("id", { ascending: true });

  return q as unknown as Q;
}
