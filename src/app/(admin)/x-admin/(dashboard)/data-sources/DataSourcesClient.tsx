"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DatabaseZap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileWarning,
  ShieldCheck,
  Loader2,
} from "lucide-react";

/** One sheet (spreadsheet), one section — whole doc or one slide (Word/PowerPoint). */
interface SubBreakdown {
  sheet?: string;
  section?: string;
  dataRows?: number;
  totalLines?: number;
  rowsUsed?: number;
  linesWithEmail?: number;
  rowsSkipped?: number;
  leadsFound: number;
}

interface FileReport {
  file: string;
  kind: string;
  status: "ok" | "failed";
  leadsFound: number;
  error: string | null;
  // Present depending on kind: spreadsheets get sheetBreakdown, Word/
  // PowerPoint get sectionBreakdown, generic PDFs get flat totals.
  sheetBreakdown?: SubBreakdown[];
  sectionBreakdown?: SubBreakdown[];
  rowsScanned?: number;
  pages?: number;
  totalLines?: number;
  linesWithEmail?: number;
}

interface Totals {
  filesScanned: number;
  rawRows: number;
  uniqueEmails: number;
  inBatchDuplicates: number;
  alreadyInDb: number;
  newLeads: number;
  unhandledFiles: string[];
  skippedDuplicatePdfs: string[];
}

export interface IngestionRun {
  id: string;
  source_folder: string;
  started_at: string;
  finished_at: string;
  files: FileReport[];
  totals: Totals;
  validated: boolean;
  validated_at: string | null;
  validation_notes: string[];
  created_at: string;
}

interface LeadStats {
  total: number;
  domestic: number;
  export: number;
  unknownMarket: number;
  aiPending: number;
  aiDone: number;
  aiFailed: number;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function StatCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone === "warn" ? "text-amber-300" : "text-white"}`}>{value}</div>
    </div>
  );
}

/** Raw/used/skipped at the file level, from whichever breakdown shape that file's kind produced. Null for older runs logged before this existed. */
function fileCounts(f: FileReport): { raw: number; used: number; skipped: number } | null {
  if (f.sheetBreakdown?.length) {
    const raw = f.sheetBreakdown.reduce((s, b) => s + (b.dataRows ?? 0), 0);
    const used = f.sheetBreakdown.reduce((s, b) => s + (b.rowsUsed ?? 0), 0);
    return { raw, used, skipped: raw - used };
  }
  if (f.sectionBreakdown?.length) {
    const raw = f.sectionBreakdown.reduce((s, b) => s + (b.totalLines ?? 0), 0);
    const used = f.sectionBreakdown.reduce((s, b) => s + (b.linesWithEmail ?? 0), 0);
    return { raw, used, skipped: raw - used };
  }
  if (f.totalLines !== undefined && f.linesWithEmail !== undefined) {
    return { raw: f.totalLines, used: f.linesWithEmail, skipped: f.totalLines - f.linesWithEmail };
  }
  return null;
}

function RunCard({ run }: { run: IngestionRun }) {
  const [open, setOpen] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set());
  const failedFiles = run.files.filter((f) => f.status === "failed");
  const duration = Math.max(
    0,
    Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-zinc-100">{run.source_folder}</span>
            {run.validated ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Validated
              </span>
            ) : run.validated_at ? (
              <span className="flex items-center gap-1 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-red-300">
                <XCircle className="h-3 w-3" /> Validation failed
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md bg-zinc-700/40 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-400">
                Not yet validated
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {new Date(run.started_at).toLocaleString("en-IN")} · took {duration}s ·{" "}
            {run.totals.filesScanned} files scanned
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-zinc-400">
            <span className="font-semibold text-zinc-100">{fmt(run.totals.rawRows)}</span> raw rows
          </span>
          <span className="text-zinc-400">
            <span className="font-semibold text-emerald-300">{fmt(run.totals.newLeads)}</span> new leads
          </span>
          {failedFiles.length > 0 && (
            <span className="flex items-center gap-1 text-amber-300">
              <FileWarning className="h-3.5 w-3.5" /> {failedFiles.length} failed
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Unique emails" value={fmt(run.totals.uniqueEmails)} />
            <StatCard label="In-batch duplicates" value={fmt(run.totals.inBatchDuplicates)} />
            <StatCard label="Already in database" value={fmt(run.totals.alreadyInDb)} />
            <StatCard label="New leads" value={fmt(run.totals.newLeads)} />
          </div>

          {(run.totals.unhandledFiles.length > 0 || run.totals.skippedDuplicatePdfs.length > 0) && (
            <div className="mt-3 space-y-1 text-xs text-zinc-500">
              {run.totals.unhandledFiles.length > 0 && (
                <p>No extractor for: {run.totals.unhandledFiles.join(", ")}</p>
              )}
              {run.totals.skippedDuplicatePdfs.length > 0 && (
                <p>Skipped (already imported via the catalogue pipeline): {run.totals.skippedDuplicatePdfs.join(", ")}</p>
              )}
            </div>
          )}

          {run.validation_notes.length > 0 && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Validation ({run.validated_at ? new Date(run.validated_at).toLocaleString("en-IN") : "—"})
              </div>
              <ul className="space-y-1 text-xs">
                {run.validation_notes.map((note, i) => (
                  <li
                    key={i}
                    className={
                      note.startsWith("FAIL")
                        ? "text-red-300"
                        : note.startsWith("ok")
                          ? "text-emerald-300"
                          : "text-zinc-400"
                    }
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-zinc-600">
            &quot;Raw&quot; is every non-blank row (spreadsheets) or line (documents/PDFs) actually
            read from the file — click a row for the sheet-by-sheet or slide-by-slide split.
            &quot;Used&quot; is how many of those had an email in them; the rest had none, which is
            why they didn&apos;t become leads.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-2 py-2 font-medium">File</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 text-right font-medium">Raw rows/lines</th>
                  <th className="px-2 py-2 text-right font-medium">Used</th>
                  <th className="px-2 py-2 text-right font-medium">Skipped (no email)</th>
                  <th className="px-2 py-2 text-right font-medium">Leads found</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {run.files.map((f, i) => {
                  const counts = fileCounts(f);
                  const breakdown = f.sheetBreakdown ?? f.sectionBreakdown ?? [];
                  const canExpand = breakdown.length > 0;
                  const expanded = expandedFiles.has(i);
                  return (
                    <Fragment key={`${f.file}-${i}`}>
                      <tr
                        className={canExpand ? "cursor-pointer hover:bg-zinc-800/30" : ""}
                        onClick={() => {
                          if (!canExpand) return;
                          setExpandedFiles((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          });
                        }}
                      >
                        <td className="max-w-[220px] truncate px-2 py-2 text-zinc-200">
                          <span className="flex items-center gap-1">
                            {canExpand &&
                              (expanded ? (
                                <ChevronUp className="h-3 w-3 flex-shrink-0 text-zinc-500" />
                              ) : (
                                <ChevronDown className="h-3 w-3 flex-shrink-0 text-zinc-500" />
                              ))}
                            {f.file}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-zinc-500">{f.kind}</td>
                        <td className="px-2 py-2 text-right text-zinc-300">
                          {counts ? fmt(counts.raw) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-emerald-300">
                          {counts ? fmt(counts.used) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-zinc-500">
                          {counts ? fmt(counts.skipped) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-zinc-300">{fmt(f.leadsFound)}</td>
                        <td className="px-2 py-2">
                          {f.status === "ok" ? (
                            <span className="text-emerald-400">ok</span>
                          ) : (
                            <span className="text-red-400" title={f.error ?? ""}>
                              failed{f.error ? ` — ${f.error}` : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded && canExpand && (
                        <tr>
                          <td colSpan={7} className="bg-zinc-950/50 px-2 py-2">
                            <table className="w-full text-xs">
                              <thead className="text-left uppercase tracking-wide text-zinc-600">
                                <tr>
                                  <th className="px-2 py-1.5 font-medium">
                                    {f.sheetBreakdown ? "Sheet" : "Section"}
                                  </th>
                                  <th className="px-2 py-1.5 text-right font-medium">Raw rows/lines</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Used</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Skipped</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Leads found</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-900">
                                {breakdown.map((b, bi) => (
                                  <tr key={bi}>
                                    <td className="max-w-[200px] truncate px-2 py-1.5 text-zinc-300">
                                      {b.sheet ?? b.section}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-zinc-400">
                                      {fmt(b.dataRows ?? b.totalLines ?? 0)}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-emerald-400">
                                      {fmt(b.rowsUsed ?? b.linesWithEmail ?? 0)}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-zinc-500">
                                      {fmt(
                                        b.rowsSkipped ??
                                          (b.totalLines ?? 0) - (b.linesWithEmail ?? 0)
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-right text-zinc-300">
                                      {fmt(b.leadsFound)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataSourcesClient({
  runs,
  runsError,
  leadStats,
}: {
  runs: IngestionRun[];
  runsError: string | null;
  leadStats: LeadStats;
}) {
  const router = useRouter();
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function runValidation() {
    setValidating(true);
    setValidateResult(null);
    try {
      const res = await fetch("/api/admin/data-sources/verify", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Validation failed to run");
      setValidateResult({
        ok: json.data.ok,
        message: json.data.ok ? "Validated — every check passed." : "Failed one or more checks — see the run below.",
      });
      router.refresh();
    } catch (err) {
      setValidateResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Data Sources</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-zinc-400">
            What has been ingested, from where, and whether it checked out. Extraction and
            enrichment still run from the command line —{" "}
            <code className="rounded bg-zinc-800 px-1">npm run leads:extract-raw</code>,{" "}
            <code className="rounded bg-zinc-800 px-1">leads:import</code>,{" "}
            <code className="rounded bg-zinc-800 px-1">leads:enrich</code> — but the validation
            check below can be run right from here.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={runValidation}
            disabled={validating || runs.length === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {validating ? "Re-checking every file…" : "Run validation"}
          </button>
          {validateResult && (
            <span className={`text-xs ${validateResult.ok ? "text-emerald-400" : "text-red-400"}`}>
              {validateResult.message}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total leads" value={fmt(leadStats.total)} />
        <StatCard label="Domestic" value={fmt(leadStats.domestic)} />
        <StatCard label="Export" value={fmt(leadStats.export)} />
        <StatCard
          label="Unclassified market"
          value={fmt(leadStats.unknownMarket)}
          tone={leadStats.unknownMarket > 0 ? "warn" : "default"}
        />
        <StatCard label="AI enriched" value={fmt(leadStats.aiDone)} />
        <StatCard
          label="AI pending"
          value={fmt(leadStats.aiPending)}
          tone={leadStats.aiPending > 0 ? "warn" : "default"}
        />
        <StatCard
          label="AI failed"
          value={fmt(leadStats.aiFailed)}
          tone={leadStats.aiFailed > 0 ? "warn" : "default"}
        />
      </div>

      {runsError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            {runsError} — run the updated{" "}
            <code className="rounded bg-zinc-800 px-1">scripts/leads/leads-schema.sql</code> in
            Supabase, then re-run <code className="rounded bg-zinc-800 px-1">leads:extract-raw</code>.
          </div>
        </div>
      )}

      {runs.length === 0 && !runsError ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
          <DatabaseZap className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-400">No ingestion runs logged yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            Run <code className="rounded bg-zinc-800 px-1">npm run leads:extract-raw</code> to
            log one here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
