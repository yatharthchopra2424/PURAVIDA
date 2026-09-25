/**
 * extract-raw-folder.ts — turns a folder of mismatched sales exports
 * (spreadsheets, Word docs, slides, ad-hoc PDFs) into one deduplicated
 * JSON ready for `leads:import`.
 *
 *   npm run leads:extract-raw
 *   npm run leads:extract-raw -- --dir docs/raw-leads/herbal-client-data
 *   npm run leads:extract-raw -- --file "Complete_Main_Imp.xlsx"   # just one file
 *
 * `--file` is the fast path after a send bounces: the campaign report
 * names which source file a failed address came from, so re-running
 * against just that one file re-reads it in seconds instead of the
 * full ~70-file folder, and any correction made in the spreadsheet
 * itself (a typo'd email fixed, say) flows through leads:import as an
 * update to that row rather than a new one — same source_ref, upsert.
 *
 * Runs extract-spreadsheets.ts / extract-documents.ts /
 * extract-pdfs-generic.ts over every file in the folder, then:
 *
 *   1. Drops any email already sitting in `leads` (checked against the
 *      live database), so re-running this after new files are added
 *      only ever adds what's new.
 *   2. Drops in-batch duplicates — the same address turning up in five
 *      different spreadsheets is extremely common here — keeping
 *      whichever occurrence has the most fields filled in.
 *
 * No network writes happen here; `leads:import` still owns that step,
 * same as the catalogue pipeline.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { NormalizedLead } from "./extract-catalog";
import { loadEnv, parseArgs, serviceClient } from "./_env";
import { excludedEmails, mergeOccurrences, phoneKey } from "./raw-shared";
import { extractSpreadsheets } from "./extract-spreadsheets";
import { extractDocuments } from "./extract-documents";
import { extractGenericPdfs } from "./extract-pdfs-generic";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (!entry.name.startsWith("~$") && entry.name.toLowerCase() !== "thumbs.db") {
      out.push(full);
    }
  }
  return out;
}

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function main() {
  loadEnv();
  const args = parseArgs();
  const startedAt = new Date();

  const dir = path.resolve(process.cwd(), String(args.dir ?? "docs/raw-leads/herbal-client-data"));
  const outPath = path.resolve(
    process.cwd(),
    String(args.out ?? "scripts/leads/out/herbal-client-data.json")
  );

  if (!fs.existsSync(dir)) {
    console.error(`\n  Folder not found: ${dir}\n`);
    process.exit(1);
  }

  const fileFilter = args.file ? String(args.file).trim().toLowerCase() : null;
  let allFiles = walk(dir);
  if (fileFilter) {
    allFiles = allFiles.filter((f) => path.basename(f).toLowerCase() === fileFilter);
    if (allFiles.length === 0) {
      console.error(`\n  No file named "${args.file}" found under ${dir}\n`);
      process.exit(1);
    }
  }
  const byExt = (exts: string[]) =>
    allFiles.filter((f) => exts.includes(path.extname(f).toLowerCase()));

  // The IPHEX catalogue already went through extract-catalog.ts's
  // dedicated parser; a byte-identical copy dropped in this folder too
  // should not be re-read by the generic (much weaker) PDF extractor.
  const catalogueHashes = new Set(
    fs
      .readdirSync("docs/catalogues")
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => sha256(path.join("docs/catalogues", f)))
  );

  const spreadsheetFiles = byExt([".xlsx", ".xls", ".csv"]);
  const documentFiles = byExt([".docx", ".doc", ".pptx"]);
  const pdfFiles = byExt([".pdf"]).filter((f) => !catalogueHashes.has(sha256(f)));
  const skippedDuplicatePdfs = byExt([".pdf"]).filter((f) => catalogueHashes.has(sha256(f)));
  const unhandled = allFiles.filter(
    (f) => ![".xlsx", ".xls", ".csv", ".docx", ".doc", ".pptx", ".pdf"].includes(path.extname(f).toLowerCase())
  );

  console.log(`\n  Scanning ${dir}`);
  console.log(`  ${allFiles.length} files: ${spreadsheetFiles.length} spreadsheets, ${documentFiles.length} documents, ${pdfFiles.length} PDFs`);
  if (skippedDuplicatePdfs.length) {
    console.log(`  skipping ${skippedDuplicatePdfs.length} PDF(s) already imported via the catalogue pipeline: ${skippedDuplicatePdfs.map((f) => path.basename(f)).join(", ")}`);
  }
  if (unhandled.length) {
    console.log(`  ${unhandled.length} file(s) with no extractor (unsupported type): ${unhandled.map((f) => path.basename(f)).join(", ")}`);
  }

  console.log(`\n  Reading spreadsheets...`);
  const ss = await extractSpreadsheets(spreadsheetFiles);
  console.log(`  Reading documents...`);
  const docs = await extractDocuments(documentFiles);
  console.log(`  Reading PDFs...`);
  const pdfs = await extractGenericPdfs(pdfFiles);

  const allReports = [
    ...ss.reports.map((r) => ({ kind: "spreadsheet", ...r })),
    ...docs.reports.map((r) => ({ kind: "document", ...r })),
    ...pdfs.reports.map((r) => ({ kind: "pdf", ...r })),
  ];

  const failed = allReports.filter((r) => !r.ok);
  console.log(`\n  ── Per-file results ──`);
  for (const r of allReports) {
    const status = r.ok ? `${r.leadsFound} leads found` : `FAILED — ${r.error}`;
    console.log(`    ${r.ok ? "ok  " : "FAIL"}  ${r.file}  (${status})`);
  }

  const rawLeads = [...ss.leads, ...docs.leads, ...pdfs.leads];
  console.log(`\n  ${rawLeads.length} raw contact rows extracted across all files`);

  // ── Merge every occurrence of an email into one record ─────────
  // Not "keep the richest, drop the rest": the same address turns up in
  // several files and each knows something the others don't (the country
  // in one, the phone in another, what they buy in a third). Every gap in
  // the fullest record is filled from the others.
  const groups = new Map<string, NormalizedLead[]>();
  let withEmail = 0;
  for (const lead of rawLeads) {
    if (!lead.email) continue;
    withEmail++;
    const g = groups.get(lead.email);
    if (g) g.push(lead);
    else groups.set(lead.email, [lead]);
  }
  const byEmail = new Map<string, NormalizedLead>();
  for (const [email, occurrences] of groups) byEmail.set(email, mergeOccurrences(occurrences));
  const inBatchDuplicates = withEmail - byEmail.size;

  // ── Contacts with no email: a name and a phone number ───────────
  // Attached to an email lead when they share a number (same person,
  // another file); otherwise kept as their own record, so a phone number
  // is never lost just because no email came with it.
  const phoneIndex = new Map<string, string>();
  for (const [email, lead] of byEmail) {
    for (const ph of lead.phones ?? []) {
      const k = phoneKey(ph);
      if (k.length >= 8 && !phoneIndex.has(k)) phoneIndex.set(k, email);
    }
  }
  const phoneGroups = new Map<string, NormalizedLead[]>();
  let phoneOnlyRaw = 0;
  let phoneOnlyAttached = 0;
  for (const lead of rawLeads) {
    if (lead.email) continue;
    phoneOnlyRaw++;
    const keys = (lead.phones ?? []).map(phoneKey).filter((k) => k.length >= 8);
    const attachTo = keys.map((k) => phoneIndex.get(k)).find(Boolean);
    if (attachTo) {
      byEmail.set(attachTo, mergeOccurrences([byEmail.get(attachTo)!, lead]));
      phoneOnlyAttached++;
      continue;
    }
    const groupKey = keys[0] ?? `name:${lead.companyName.toLowerCase()}`;
    const g = phoneGroups.get(groupKey);
    if (g) g.push(lead);
    else phoneGroups.set(groupKey, [lead]);
  }
  const phoneOnlyLeads: NormalizedLead[] = [...phoneGroups.values()].map((g) => mergeOccurrences(g));

  {
    const bySource: Record<string, number> = {};
    let withCountry = 0;
    for (const l of byEmail.values()) {
      if (l.country) {
        withCountry++;
        bySource[l.countrySource ?? "unknown"] = (bySource[l.countrySource ?? "unknown"] ?? 0) + 1;
      }
    }
    console.log(`\n  ── Country coverage after merging ──`);
    console.log(`    with a country   ${withCountry} of ${byEmail.size}  (${Math.round((withCountry / Math.max(byEmail.size, 1)) * 100)}%)`);
    for (const [src, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${String(n).padStart(6)}  ${src}`);
    }
    console.log(`    still unknown    ${byEmail.size - withCountry}`);
  }

  // ── Drop anything already in the database ───────────────────────
  const supabase = serviceClient();
  const existingEmails = new Set<string>();
  const existingPhones = new Set<string>();
  {
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("leads")
        .select("email, company_email, phone, mobile")
        // A fixed order: rows are being updated by enrichment while this
        // pages through, and an unordered scan can skip or repeat rows.
        .order("id")
        .range(from, from + pageSize - 1);
      if (error) {
        console.error(`\n  Could not read existing leads for dedupe: ${error.message}\n`);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      for (const row of data as { email: string | null; company_email: string | null; phone: string | null; mobile: string | null }[]) {
        if (row.email) existingEmails.add(row.email.toLowerCase());
        if (row.company_email) existingEmails.add(row.company_email.toLowerCase());
        for (const ph of [row.phone, row.mobile]) {
          if (ph) for (const one of ph.split(/[,;/]/)) if (phoneKey(one).length >= 8) existingPhones.add(phoneKey(one));
        }
      }
      if (data.length < pageSize) break;
    }
  }

  let alreadyInDb = 0;
  const newLeads: NormalizedLead[] = [];
  for (const lead of byEmail.values()) {
    if (lead.email && existingEmails.has(lead.email)) {
      alreadyInDb++;
      continue;
    }
    newLeads.push(lead);
  }

  const newPhoneOnly = phoneOnlyLeads.filter(
    (l) => !(l.phones ?? []).some((ph) => existingPhones.has(phoneKey(ph)))
  );
  newLeads.push(...newPhoneOnly);

  console.log(`\n  ── Contacts with a phone but no email ──`);
  console.log(`    rows found                       ${phoneOnlyRaw}`);
  console.log(`    matched to an email lead         ${phoneOnlyAttached}`);
  console.log(`    kept as their own contact        ${phoneOnlyLeads.length}  (${newPhoneOnly.length} not yet in the database)`);

  console.log(`\n  ── Emails deliberately not made leads ──`);
  for (const [reason, set] of excludedEmails) console.log(`    ${String(set.size).padStart(5)}  ${reason}`);

  console.log(`\n  ── Dedupe ──`);
  console.log(`    unique emails found this run   ${byEmail.size}`);
  console.log(`    in-batch duplicates dropped    ${inBatchDuplicates}`);
  console.log(`    already in the database        ${alreadyInDb}`);
  console.log(`    new leads to import             ${newLeads.length}`);

  const companyGuessed = newLeads.filter((l) => l.parseWarnings.includes("company-name-guessed")).length;
  const companyFromDomain = newLeads.filter((l) => l.parseWarnings.includes("company-name-from-domain")).length;
  console.log(`\n    company name from a mapped column   ${newLeads.length - companyGuessed - companyFromDomain}`);
  console.log(`    company name guessed from the row   ${companyGuessed}`);
  console.log(`    company name unknown (domain used)  ${companyFromDomain}`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        source: "herbal-client-data-batch",
        extractedAt: new Date().toISOString(),
        sourceFolder: dir,
        leadCount: newLeads.length,
        fileReports: allReports,
        leads: newLeads,
      },
      null,
      2
    )
  );

  // Every merged record — new AND already-imported — so
  // apply-raw-enrichment.ts can fill the fields the first import never captured.
  const mergedPath = outPath.replace(/\.json$/, ".merged.json");
  fs.writeFileSync(
    mergedPath,
    JSON.stringify({ extractedAt: new Date().toISOString(), leadCount: byEmail.size + phoneOnlyLeads.length, leads: [...byEmail.values(), ...phoneOnlyLeads] })
  );
  console.log(`\n  Wrote ${path.relative(process.cwd(), mergedPath)} (${byEmail.size + phoneOnlyLeads.length} merged records)`);

  console.log(`\n  Wrote ${path.relative(process.cwd(), outPath)}`);
  console.log(`\n  Next: npm run leads:import -- --file ${path.relative(process.cwd(), outPath)}\n`);

  if (failed.length) {
    console.log(`  ${failed.length} file(s) could not be read at all — see FAILED lines above.\n`);
  }

  // Persist the report so it survives past this terminal — the admin's
  // Data Sources page reads this table, not the console output above.
  const { error: runError } = await supabase.from("data_ingestion_runs").insert({
    // Real directory path always — verify-ingestion-core.ts's on-disk
    // check depends on this resolving with fs.existsSync. Which single
    // file (if any) this run was scoped to lives in totals.scopedToFile
    // instead, purely for display.
    source_folder: dir,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    // Keep every field each extractor's report carries (sheetBreakdown,
    // sectionBreakdown, rowsScanned, pages, totalLines, linesWithEmail —
    // whichever apply to that file's kind), not just the five common
    // ones — the Data Sources page's per-file drill-down reads them.
    files: allReports.map(({ ok, ...r }) => ({
      ...r,
      status: ok ? "ok" : "failed",
      leadsFound: ok ? r.leadsFound : 0,
      error: ok ? null : r.error,
    })),
    totals: {
      filesScanned: allFiles.length,
      rawRows: rawLeads.length,
      uniqueEmails: byEmail.size,
      inBatchDuplicates,
      alreadyInDb,
      newLeads: newLeads.length,
      phoneOnlyLeads: phoneOnlyLeads.length,
      newPhoneOnly: newPhoneOnly.length,
      excludedEmails: Object.fromEntries([...excludedEmails].map(([k, v]) => [k, v.size])),
      unhandledFiles: unhandled.map((f) => path.basename(f)),
      skippedDuplicatePdfs: skippedDuplicatePdfs.map((f) => path.basename(f)),
      // Set only for a `--file`-scoped run — lets the Data Sources page
      // and the validator both recognise "this run only ever looked at
      // one file" instead of reading it as a folder scan that somehow
      // only found one file.
      scopedToFile: fileFilter ? path.basename(allFiles[0]) : null,
    },
  });
  if (runError) {
    console.log(`  (Could not save the run to the admin dashboard: ${runError.message})`);
    console.log(`  Run the updated scripts/leads/leads-schema.sql in Supabase, then re-run leads:extract-raw.\n`);
  } else {
    console.log(`  Logged this run to the admin's Data Sources page.\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
