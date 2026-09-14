"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Download,
  Send,
  RefreshCw,
  X,
  AlertTriangle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DEFAULT_LEAD_FILTERS,
  LEAD_PRIORITIES,
  LEAD_SEGMENTS,
  LEAD_STATUSES,
  LEAD_TAGS,
  STATUS_LABELS,
  TAG_LABELS,
  serializeLeadFilters,
  primaryEmail,
  displayLocation,
  type Lead,
  type LeadFilters,
} from "@/lib/leads";
import LeadDrawer from "./LeadDrawer";

/**
 * Key the composer reads an explicit id selection from.
 *
 * A 600-lead selection will not fit in a query string, and putting it
 * in one would also make the campaign URL shareable in a way that
 * quietly re-targets whoever opens it.
 */
export const SELECTION_STORAGE_KEY = "puravida:lead-selection";

const PRIORITY_STYLES: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  B: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  C: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  D: "bg-zinc-700/40 text-zinc-400 border-zinc-600/40",
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-zinc-700/40 text-zinc-300",
  queued: "bg-indigo-500/15 text-indigo-300",
  contacted: "bg-sky-500/15 text-sky-300",
  replied: "bg-emerald-500/15 text-emerald-300",
  qualified: "bg-emerald-500/25 text-emerald-200",
  won: "bg-emerald-600/30 text-emerald-100",
  lost: "bg-zinc-700/40 text-zinc-500",
  do_not_contact: "bg-red-500/15 text-red-300",
};

interface Props {
  initialLeads: Lead[];
  initialTotal: number;
  sources: string[];
  setupError: string | null;
  pageSize: number;
}

export default function LeadsClient({
  initialLeads,
  initialTotal,
  sources,
  setupError,
  pageSize,
}: Props) {
  const router = useRouter();

  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_LEAD_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // The first render already has server-fetched rows; refetching them
  // immediately would double the work and flash the table.
  const isFirstRun = useRef(true);

  const query = useMemo(() => serializeLeadFilters(filters).toString(), [filters]);

  const fetchLeads = useCallback(
    async (targetPage: number, filterQuery: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(filterQuery);
        params.set("page", String(targetPage));
        params.set("limit", String(pageSize));

        const res = await fetch(`/api/admin/leads?${params}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error ?? "Could not load leads");

        setLeads(json.data ?? []);
        setTotal(json.total ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchLeads(page, query);
  }, [page, query, fetchLeads]);

  // Debounce the search box so a query is not fired per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchDraft ? f : { ...f, search: searchDraft }));
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  function updateFilters(patch: Partial<LeadFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    // A filter change makes "all N matching" mean something different,
    // so the blanket selection must not survive it.
    setSelectAllMatching(false);
  }

  function toggleInList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectAllMatching(false);
  }

  function toggleSelectPage() {
    const pageIds = leads.map((l) => l.id);
    const allOnPage = pageIds.every((id) => selected.has(id));

    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allOnPage) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setSelectAllMatching(false);
  }

  function clearSelection() {
    setSelected(new Set());
    setSelectAllMatching(false);
  }

  const selectionCount = selectAllMatching ? total : selected.size;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allOnPageSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));

  function startCampaign() {
    if (selectionCount === 0) return;

    if (selectAllMatching) {
      // Filter mode: the composer re-runs the query at send time, so
      // the audience is whatever matches then, not a stale id list.
      router.push(`/x-admin/campaigns/new?mode=filters&${query}`);
      return;
    }

    sessionStorage.setItem(
      SELECTION_STORAGE_KEY,
      JSON.stringify({ ids: [...selected], savedAt: Date.now() })
    );
    router.push("/x-admin/campaigns/new?mode=ids");
  }

  function onLeadUpdated(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setActiveLead((current) => (current?.id === updated.id ? updated : current));
  }

  const activeFilterCount =
    filters.tags.length +
    filters.segments.length +
    filters.priorities.length +
    filters.statuses.length +
    (filters.source ? 1 : 0) +
    (filters.minScore !== null ? 1 : 0) +
    (filters.hasEmail ? 1 : 0) +
    (filters.contactable ? 1 : 0);

  if (setupError) {
    return (
      <div className="max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="font-heading text-lg font-bold">Lead database not ready</h1>
        </div>
        <p className="mb-4 text-sm text-amber-200/80">{setupError}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
          <li>
            Run <code className="rounded bg-zinc-800 px-1.5 py-0.5">scripts/leads/leads-schema.sql</code>{" "}
            in the Supabase SQL editor.
          </li>
          <li>
            <code className="rounded bg-zinc-800 px-1.5 py-0.5">npm run leads:extract</code>
          </li>
          <li>
            <code className="rounded bg-zinc-800 px-1.5 py-0.5">npm run leads:import</code>
          </li>
          <li>
            <code className="rounded bg-zinc-800 px-1.5 py-0.5">npm run leads:enrich</code>
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Leads</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {total.toLocaleString()} matching
            {selectionCount > 0 && (
              <span className="text-emerald-400"> · {selectionCount.toLocaleString()} selected</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchLeads(page, query)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {/* A real link, not a router push: this endpoint returns a
              file attachment rather than a page to navigate to. */}
          <a
            href={`/api/admin/leads/export?${query}`}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <button
            onClick={startCampaign}
            disabled={selectionCount === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <Send className="h-4 w-4" />
            Email {selectionCount > 0 ? selectionCount.toLocaleString() : ""}
          </button>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search company, contact or email…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500/50"
          />
        </div>

        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-emerald-500 px-1.5 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <select
          value={filters.sort}
          onChange={(e) => updateFilters({ sort: e.target.value as LeadFilters["sort"] })}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/50"
        >
          <option value="score">Best fit first</option>
          <option value="company">Company A–Z</option>
          <option value="recent">Recently added</option>
          <option value="page">Catalogue order</option>
        </select>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <FilterGroup label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {LEAD_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  active={filters.tags.includes(tag)}
                  onClick={() => updateFilters({ tags: toggleInList(filters.tags, tag) })}
                >
                  {TAG_LABELS[tag] ?? tag}
                </Chip>
              ))}
            </div>
            {filters.tags.length > 1 && (
              <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={filters.tagsMatchAll}
                  onChange={(e) => updateFilters({ tagsMatchAll: e.target.checked })}
                  className="accent-emerald-500"
                />
                Must have every selected tag (instead of any)
              </label>
            )}
          </FilterGroup>

          <FilterGroup label="Priority">
            <div className="flex flex-wrap gap-1.5">
              {LEAD_PRIORITIES.map((p) => (
                <Chip
                  key={p}
                  active={filters.priorities.includes(p)}
                  onClick={() =>
                    updateFilters({ priorities: toggleInList(filters.priorities, p) })
                  }
                >
                  {p}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Segment">
            <div className="flex flex-wrap gap-1.5">
              {LEAD_SEGMENTS.map((s) => (
                <Chip
                  key={s}
                  active={filters.segments.includes(s)}
                  onClick={() => updateFilters({ segments: toggleInList(filters.segments, s) })}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Status">
            <div className="flex flex-wrap gap-1.5">
              {LEAD_STATUSES.map((s) => (
                <Chip
                  key={s}
                  active={filters.statuses.includes(s)}
                  onClick={() => updateFilters({ statuses: toggleInList(filters.statuses, s) })}
                >
                  {STATUS_LABELS[s] ?? s}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <div className="flex flex-wrap items-end gap-4">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Minimum score
              <input
                type="number"
                min={0}
                max={100}
                value={filters.minScore ?? ""}
                onChange={(e) =>
                  updateFilters({
                    minScore: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="any"
                className="mt-1 block w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              />
            </label>

            {sources.length > 1 && (
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Catalogue
                <select
                  value={filters.source ?? ""}
                  onChange={(e) => updateFilters({ source: e.target.value || null })}
                  className="mt-1 block rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
                >
                  <option value="">All</option>
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex items-center gap-2 pb-1.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={filters.hasEmail}
                onChange={(e) => updateFilters({ hasEmail: e.target.checked })}
                className="accent-emerald-500"
              />
              Has an email address
            </label>

            <label className="flex items-center gap-2 pb-1.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={filters.contactable}
                onChange={(e) => updateFilters({ contactable: e.target.checked })}
                className="accent-emerald-500"
              />
              Contactable only
            </label>

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilters({ ...DEFAULT_LEAD_FILTERS, search: filters.search });
                  setPage(1);
                  setSelectAllMatching(false);
                }}
                className="flex items-center gap-1 pb-1.5 text-sm text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Select-all banner */}
      {allOnPageSelected && total > leads.length && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
          {selectAllMatching ? (
            <>
              <span>All {total.toLocaleString()} leads matching these filters are selected.</span>
              <button onClick={clearSelection} className="font-semibold underline">
                Clear selection
              </button>
            </>
          ) : (
            <>
              <span>All {leads.length} on this page are selected.</span>
              <button
                onClick={() => setSelectAllMatching(true)}
                className="font-semibold underline"
              >
                Select all {total.toLocaleString()} matching
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectPage}
                  aria-label="Select all on this page"
                  className="accent-emerald-500"
                />
              </th>
              <th className="px-3 py-3 font-medium">Company</th>
              <th className="px-3 py-3 font-medium">Contact</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Location</th>
              <th className="px-3 py-3 font-medium">Segment</th>
              <th className="px-3 py-3 font-medium">Tags</th>
              <th className="px-3 py-3 text-center font-medium">Fit</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {leads.map((lead) => {
              const email = primaryEmail(lead);
              return (
                <tr
                  key={lead.id}
                  onClick={() => setActiveLead(lead)}
                  className={`cursor-pointer transition-colors hover:bg-zinc-800/50 ${
                    selected.has(lead.id) ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelected(lead.id)}
                      aria-label={`Select ${lead.company_name}`}
                      className="accent-emerald-500"
                    />
                  </td>
                  <td className="max-w-[240px] px-3 py-3">
                    <div className="truncate font-medium text-zinc-100">
                      {lead.company_name}
                    </div>
                    {lead.stall_no && (
                      <div className="text-xs text-zinc-500">
                        {lead.hall_no} · {lead.stall_no}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[170px] px-3 py-3">
                    <div className="truncate text-zinc-200">{lead.contact_name ?? "—"}</div>
                    {lead.designation && (
                      <div className="truncate text-xs text-zinc-500">{lead.designation}</div>
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-3">
                    {email ? (
                      <span className="block truncate text-zinc-300">{email}</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                    {lead.mobile_e164 && (
                      <div className="text-xs text-zinc-500">{lead.mobile_e164}</div>
                    )}
                  </td>
                  <td className="max-w-[140px] px-3 py-3">
                    <span className="block truncate text-zinc-400">
                      {displayLocation(lead) || "—"}
                    </span>
                  </td>
                  <td className="max-w-[150px] px-3 py-3">
                    <span className="block truncate text-zinc-400">{lead.segment ?? "—"}</span>
                  </td>
                  <td className="max-w-[180px] px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(lead.tags ?? []).slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400"
                        >
                          {TAG_LABELS[tag] ?? tag}
                        </span>
                      ))}
                      {(lead.tags ?? []).length > 2 && (
                        <span className="px-1 text-xs text-zinc-600">
                          +{(lead.tags ?? []).length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {lead.priority ? (
                      <span
                        title={`Score ${lead.icp_score ?? "?"}/100`}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold ${
                          PRIORITY_STYLES[lead.priority] ?? PRIORITY_STYLES.D
                        }`}
                      >
                        {lead.priority}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">
                        {lead.ai_status === "pending" ? "…" : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[lead.status] ?? STATUS_STYLES.new
                      }`}
                    >
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </td>
                </tr>
              );
            })}

            {leads.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-sm text-zinc-500">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {activeLead && (
        <LeadDrawer
          key={activeLead.id}
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onUpdated={onLeadUpdated}
        />
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
          : "border-zinc-700/60 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
