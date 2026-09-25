/**
 * extract-documents.ts — one contact per email address found in any
 * .doc/.docx/.pptx file.
 *
 * These are free text, not tables, so there is no header row to map.
 * Each file is reduced to a flat list of lines (paragraphs for Word,
 * "<a:t>" runs per slide for PowerPoint), and every line holding an
 * email address becomes a lead, with the company name, contact name,
 * phone and website guessed from a small window of surrounding lines —
 * exactly how a human skimming the list would read it:
 *
 *   Sunkoo LTD.                      <- company name candidate
 *   1 Ra 203 Sihwa Industrial Complex,
 *   Jungwang, Siheung, Kyungki, South Korea
 *   Phone: +82-31-497-6691
 *   Email: info@sunkoochem.com       <- the line that anchors the lead
 *   Web: http://sunkoochem.com
 *
 * A file with no real structure at all (a flat list of a hundred
 * addresses, one per line) still works: the window search simply finds
 * no name candidate and the lead falls back to a domain-derived company
 * name, same as the spreadsheet extractor.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { NormalizedLead } from "./extract-catalog";
import { extractFromLines, slugify } from "./raw-shared";

async function textFromDocx(filePath: string): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function textFromDoc(filePath: string): Promise<string> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(filePath);
  return [doc.getBody(), doc.getFootnotes(), doc.getEndnotes(), doc.getHeaders(), doc.getFooters()]
    .filter(Boolean)
    .join("\n");
}

async function textFromPptx(filePath: string): Promise<string[]> {
  const JSZip = (await import("jszip")).default;
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort();

  const perSlide: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    perSlide.push(runs.join("\n"));
  }
  return perSlide;
}

export interface DocumentSectionBreakdown {
  /** The whole document for .doc/.docx; one entry per slide for .pptx. */
  section: string;
  totalLines: number;
  linesWithEmail: number;
  leadsFound: number;
}

export interface DocumentReport {
  file: string;
  ok: boolean;
  error?: string;
  leadsFound: number;
  sectionBreakdown: DocumentSectionBreakdown[];
}

export async function extractDocuments(
  files: string[]
): Promise<{ leads: NormalizedLead[]; reports: DocumentReport[] }> {
  const leads: NormalizedLead[] = [];
  const reports: DocumentReport[] = [];

  for (const filePath of files) {
    const base = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileSlug = slugify(base);
    const source = `doc-${fileSlug}`;
    const report: DocumentReport = { file: base, ok: true, leadsFound: 0, sectionBreakdown: [] };

    try {
      if (ext === ".pptx") {
        const slides = await textFromPptx(filePath);
        slides.forEach((text, slideIdx) => {
          const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          const { leads: slideLeads, totalLines, linesWithEmail } = extractFromLines(
            lines,
            `${source}-slide${slideIdx + 1}`
          );
          leads.push(...slideLeads);
          report.leadsFound += slideLeads.length;
          report.sectionBreakdown.push({
            section: `Slide ${slideIdx + 1}`,
            totalLines,
            linesWithEmail,
            leadsFound: slideLeads.length,
          });
        });
      } else {
        const text = ext === ".doc" ? await textFromDoc(filePath) : await textFromDocx(filePath);
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const { leads: fileLeads, totalLines, linesWithEmail } = extractFromLines(lines, source);
        leads.push(...fileLeads);
        report.leadsFound = fileLeads.length;
        report.sectionBreakdown.push({
          section: "Document",
          totalLines,
          linesWithEmail,
          leadsFound: fileLeads.length,
        });
      }
    } catch (err) {
      report.ok = false;
      report.error = err instanceof Error ? err.message : String(err);
    }

    reports.push(report);
  }

  return { leads, reports };
}
