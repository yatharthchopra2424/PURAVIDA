/**
 * extract-pdfs-generic.ts — email-driven contact extraction for PDFs
 * that are not the IPHEX catalogue (extract-catalog.ts owns that one,
 * with a parser tuned to its exact two-column layout).
 *
 * A trade-show directory like Vitafoods' has its own layout that would
 * need its own bespoke parser to read perfectly — not worth building for
 * a supplementary file. Instead each page's text is read in natural
 * top-to-bottom order and handed to the same line-window heuristic
 * extract-documents.ts uses for Word files: find the email, guess the
 * company/contact from the lines just above it. Less precise than a
 * dedicated parser, but nothing with an email address in it is missed.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { NormalizedLead } from "./extract-catalog";
import { extractFromLines, slugify } from "./raw-shared";

async function pageLines(pdfPath: string): Promise<string[][]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;

  const pages: string[][] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();

    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const y = Math.round((item.transform[5] as number) * 2) / 2;
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4] as number, str: item.str });
      rows.set(y, row);
    }

    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, row]) => row.sort((a, b) => a.x - b.x).map((c) => c.str).join(""))
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    pages.push(lines);
    page.cleanup();
  }
  await doc.cleanup();
  return pages;
}

export interface GenericPdfReport {
  file: string;
  ok: boolean;
  error?: string;
  pages: number;
  /** Non-blank text lines across every page. */
  totalLines: number;
  /** Of those, how many carried an email. */
  linesWithEmail: number;
  leadsFound: number;
}

export async function extractGenericPdfs(
  files: string[]
): Promise<{ leads: NormalizedLead[]; reports: GenericPdfReport[] }> {
  const leads: NormalizedLead[] = [];
  const reports: GenericPdfReport[] = [];

  for (const filePath of files) {
    const base = path.basename(filePath);
    const source = `pdf-${slugify(base)}`;
    const report: GenericPdfReport = {
      file: base,
      ok: true,
      pages: 0,
      totalLines: 0,
      linesWithEmail: 0,
      leadsFound: 0,
    };

    try {
      const pages = await pageLines(filePath);
      report.pages = pages.length;

      pages.forEach((lines, idx) => {
        const { leads: pageLeads, totalLines, linesWithEmail } = extractFromLines(lines, `${source}-p${idx + 1}`);
        leads.push(...pageLeads);
        report.leadsFound += pageLeads.length;
        report.totalLines += totalLines;
        report.linesWithEmail += linesWithEmail;
      });
    } catch (err) {
      report.ok = false;
      report.error = err instanceof Error ? err.message : String(err);
    }

    reports.push(report);
  }

  return { leads, reports };
}
