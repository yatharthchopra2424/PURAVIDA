/**
 * verify-ingestion-core.ts — the actual checks, shared by the CLI
 * (verify-ingestion.ts, `npm run leads:verify-ingestion`) and the
 * admin's "Run validation" button
 * (src/app/api/admin/data-sources/verify/route.ts) so the two can never
 * silently disagree about what "validated" means.
 *
 * Three things, each checked against the live filesystem/database
 * rather than against numbers the run already believed about itself:
 *
 *   1. Every file currently sitting in the source folder is accounted
 *      for in the run's file list — processed, explicitly skipped as a
 *      duplicate of the catalogue PDF, or flagged as an unsupported
 *      type. A file added after the last run shows up here as
 *      "not yet ingested" rather than silently being missing.
 *   2. Every email address extraction actually finds — re-run for
 *      real, not read from the report — exists somewhere in the
 *      database right now. Deliberately *not* "does this file's own
 *      source tag have rows": several files here are byte-identical to
 *      another file (IN.xls / DolphinInbox.xls, Ou.xls /
 *      DolphinOutbox.xls, two different "Final client data" copies…),
 *      so the dedupe step correctly keeps one of the pair and the
 *      other's own source tag legitimately ends up empty. What must be
 *      true is that the *email itself* made it in under whichever
 *      source won — checked directly here rather than inferred.
 *   3. The run's own totals arithmetic is self-consistent (raw rows ≥
 *      unique emails ≥ new leads, etc.) — catches a bug in the report
 *      itself, not just a bug in what it reported on.
 *
 * The re-extraction in step 2 needs the raw files on disk, which only
 * exist on whatever machine actually has docs/raw-leads/ checked out —
 * never the deployed app. Run from the browser against a production
 * deploy, step 1 and 2 both degrade to a clear note instead of a false
 * failure; step 3 (pure arithmetic on numbers already in the database)
 * still runs everywhere.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractSpreadsheets } from "./extract-spreadsheets";
import { extractDocuments } from "./extract-documents";
import { extractGenericPdfs } from "./extract-pdfs-generic";
import { phoneKey } from "./raw-shared";

interface FileReport {
  file: string;
  kind: string;
  status: "ok" | "failed";
  leadsFound: number;
  error: string | null;
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
  /** Set when the run was `--file`-scoped to just one file rather than a full folder scan. */
  scopedToFile?: string | null;
  /** Contacts kept with no email (name + phone), and how many of those were new. */
  phoneOnlyLeads?: number;
  newPhoneOnly?: number;
}

interface RunRow {
  id: string;
  source_folder: string;
  started_at: string;
  finished_at: string;
  files: FileReport[];
  totals: Totals;
}

export interface VerificationResult {
  hasRun: boolean;
  ok: boolean;
  notes: string[];
  runId: string | null;
  sourceFolder: string | null;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (!entry.name.startsWith("~$") && entry.name.toLowerCase() !== "thumbs.db") out.push(full);
  }
  return out;
}

/** Runs all three checks against the most recent ingestion run and writes the result back onto it. */
export async function verifyLatestIngestionRun(
  supabase: SupabaseClient
): Promise<VerificationResult> {
  const notes: string[] = [];
  let ok = true;
  const fail = (msg: string) => {
    notes.push(`FAIL: ${msg}`);
    ok = false;
  };
  const pass = (msg: string) => notes.push(`ok: ${msg}`);

  const { data: run, error: runError } = await supabase
    .from("data_ingestion_runs")
    .select("id, source_folder, started_at, finished_at, files, totals")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) throw new Error(runError.message);
  if (!run) return { hasRun: false, ok: false, notes: [], runId: null, sourceFolder: null };

  const row = run as RunRow;

  // ── 1. Every file on disk is accounted for ─────────────────────
  // Skipped for a `--file`-scoped run: it was never meant to cover the
  // whole folder, so comparing it against every file on disk would
  // report ~70 files as "not yet ingested" when nothing is actually
  // wrong.
  if (row.totals.scopedToFile) {
    notes.push(`note: this run was scoped to one file (${row.totals.scopedToFile}) — the full-folder check only runs on a folder scan`);
  } else if (fs.existsSync(row.source_folder)) {
    const onDisk = new Set(walk(row.source_folder).map((f) => path.basename(f)));
    const reported = new Set([
      ...row.files.map((f) => f.file),
      ...row.totals.unhandledFiles,
      ...row.totals.skippedDuplicatePdfs,
    ]);
    const unaccounted = [...onDisk].filter((f) => !reported.has(f));

    if (unaccounted.length === 0) {
      pass(`every file in ${path.basename(row.source_folder)} is accounted for (${onDisk.size} files)`);
    } else {
      fail(
        `${unaccounted.length} file(s) on disk were not in the run's report — not yet ingested: ${unaccounted.slice(0, 10).join(", ")}`
      );
    }
  } else {
    notes.push(
      `note: source folder not visible from this process (${row.source_folder}) — skipped the on-disk check. Run this from the machine that holds the raw files for a full check.`
    );
  }

  // ── 2. Every email extraction finds right now is really in the DB ──
  if (fs.existsSync(row.source_folder)) {
    const okFiles = row.files.filter((f) => f.status === "ok");
    const byExt = (exts: string[]) =>
      okFiles
        .map((f) => path.join(row.source_folder, f.file))
        .filter((p) => fs.existsSync(p) && exts.includes(path.extname(p).toLowerCase()));

    const [ss, docs, pdfs] = await Promise.all([
      extractSpreadsheets(byExt([".xlsx", ".xls", ".csv"])),
      extractDocuments(byExt([".docx", ".doc", ".pptx"])),
      extractGenericPdfs(byExt([".pdf"])),
    ]);
    const allEmails = [
      ...new Set(
        [...ss.leads, ...docs.leads, ...pdfs.leads].map((l) => l.email).filter((e): e is string => Boolean(e))
      ),
    ];

    // Pulled into memory and checked locally rather than one giant
    // `.in()` filter — a filter list of thousands of emails builds a
    // URL PostgREST rejects outright with a bare "Bad Request", which
    // silently looks identical to "found nothing" if the error isn't
    // checked. The whole table is ~9k rows either way; cheaper to just
    // hold it all than to find the right chunk size.
    const found = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("leads").select("email, company_email").order("id").range(from, from + 999);
      if (error) {
        fail(`could not read leads to cross-check emails: ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;
      for (const r of data as { email: string | null; company_email: string | null }[]) {
        if (r.email) found.add(r.email.toLowerCase());
        if (r.company_email) found.add(r.company_email.toLowerCase());
      }
      if (data.length < 1000) break;
    }

    // Phones: every number extraction finds must be stored somewhere on a lead.
    // Digits of every stored phone/mobile, one blob: a number counts as stored when its digits appear
    // in some lead's phone text, however that text is punctuated ("0331/715.111", "91-80-4632-7000").
    const storedDigits: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("leads").select("phone, mobile").order("id").range(from, from + 999);
      if (error || !data?.length) break;
      for (const r of data as { phone: string | null; mobile: string | null }[]) {
        for (const v of [r.phone, r.mobile]) if (v) storedDigits.push(v.replace(/\D/g, ""));
      }
      if (data.length < 1000) break;
    }
    const arrayProbe = await supabase.from("leads").select("phones").limit(1);
    if (!arrayProbe.error) {
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from("leads").select("phones").order("id").range(from, from + 999);
        if (!data?.length) break;
        for (const r of data as { phones: string[] | null }[]) for (const ph of r.phones ?? []) storedDigits.push(ph.replace(/\D/g, ""));
        if (data.length < 1000) break;
      }
    }
    const allPhones = new Set<string>();
    for (const l of [...ss.leads, ...docs.leads, ...pdfs.leads]) {
      for (const ph of [...(l.phones ?? []), l.phone]) if (ph && phoneKey(ph).length >= 8) allPhones.add(phoneKey(ph));
    }
    const blob = "|" + storedDigits.join("|") + "|";
    const phonesMissing = [...allPhones].filter((k) => !blob.includes(k));
    if (phonesMissing.length === 0) {
      pass(`every phone number extraction finds (${allPhones.size} distinct numbers) is stored on a lead`);
    } else {
      fail(`${phonesMissing.length} of ${allPhones.size} extracted phone numbers are not stored on any lead: ${phonesMissing.slice(0, 8).join(", ")}`);
    }

    const missing = allEmails.filter((e) => !found.has(e));
    if (missing.length === 0) {
      pass(
        `every email re-extraction finds right now (${allEmails.length} addresses, ${okFiles.length} files) is present in the database`
      );
    } else {
      fail(`${missing.length} of ${allEmails.length} re-extracted emails are missing from the database: ${missing.slice(0, 10).join(", ")}`);
    }
  } else {
    notes.push("note: source folder not visible from this process — skipped the re-extraction check");
  }

  // ── 3. The report's own arithmetic holds together ──────────────
  const t = row.totals;
  if (t.uniqueEmails > t.rawRows) {
    fail(`totals are inconsistent: uniqueEmails (${t.uniqueEmails}) > rawRows (${t.rawRows})`);
  } else {
    pass(`totals arithmetic holds: ${t.rawRows} raw rows → ${t.uniqueEmails} unique emails`);
  }
  const newEmailLeads = t.newLeads - (t.newPhoneOnly ?? 0);
  if (newEmailLeads + t.alreadyInDb !== t.uniqueEmails) {
    fail(
      `new email leads (${newEmailLeads}) + alreadyInDb (${t.alreadyInDb}) = ${newEmailLeads + t.alreadyInDb}, expected uniqueEmails (${t.uniqueEmails})`
    );
  } else {
    pass("newLeads + alreadyInDb accounts for every unique email found");
  }

  const { count: totalLeads } = await supabase.from("leads").select("id", { count: "exact", head: true });
  notes.push(`info: leads table currently holds ${totalLeads ?? "?"} rows total`);

  await supabase
    .from("data_ingestion_runs")
    .update({ validated: ok, validated_at: new Date().toISOString(), validation_notes: notes })
    .eq("id", row.id);

  return { hasRun: true, ok, notes, runId: row.id, sourceFolder: row.source_folder };
}
