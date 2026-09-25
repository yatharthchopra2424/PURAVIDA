/**
 * extract-catalog.ts — trade-show catalogue PDF → structured JSON.
 *
 *   npm run leads:extract
 *   npm run leads:extract -- --pdf docs/catalogues/iphex-2026.pdf --source iphex-2026
 *
 * Catalogues live in docs/catalogues/ (gitignored), never in public/ —
 * anything under public/ is served at a guessable URL, and this one
 * carries 642 named people's direct emails and mobile numbers.
 *
 * The IPHEX catalogue gives each exhibitor one page, laid out in two
 * columns plus a footer:
 *
 *     AMTEC HEALTH CARE PVT. LTD.          Hall No: Hall-3FF   <- right column
 *     03 Om Shiv, Ghodbunder Road, ...     Stall No: 3FA-24
 *     Thane West, Mumbai, Maharashtra-400607, India
 *     Contact Person Name: Ms. Geeta Seshadri
 *     Designation: Director
 *     Mobile: 9652899333
 *     Contact Email: geeta@amteclifesciences.com
 *     Company Profile: ... (wraps over many lines)
 *     Product Category: APIs [X, Y], Intermediates
 *                        32                                    <- footer
 *
 * Reading order matters: `Hall No` sits a few points *above* the
 * company name, so a naive top-to-bottom sort puts it first and the
 * company name then looks like a continuation of it. The parser
 * therefore splits the page by X into a main column and a side column,
 * and treats every field as single-line except the two that genuinely
 * wrap (`Company Profile`, `Product Category`).
 *
 * Anything it does not recognise is reported at the end instead of
 * being silently dropped — an unknown label in next year's PDF should
 * be visible, not lost.
 *
 * No network, no database. Output is a JSON file that import-leads.ts
 * consumes, so extraction can be re-run and diffed safely.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "./_env";

// ── Ligature repair ──────────────────────────────────────────
// The catalogue embeds fi/fl/ff as Private Use Area glyphs with no
// ToUnicode mapping, so raw extraction yields "Company Prole",
// "certied", "re retardants". Left alone this corrupts exactly the
// company-profile prose that the AI enrichment step reads.
const LIGATURES: Record<string, string> = {
  "\uF000": "ff",
  "\uF001": "fi",
  "\uF002": "fl",
  "\uF003": "ffi",
  "\uF004": "ffl",
  "\uFB00": "ff",
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
};

function repairLigatures(text: string): string {
  return text.replace(
    /[\uF000-\uF004\uFB00-\uFB04]/g,
    (ch) => LIGATURES[ch] ?? ""
  );
}

// ── Field labels ─────────────────────────────────────────────

interface FieldSpec {
  label: string;
  canonical: string;
  /** Values that legitimately wrap across lines. Everything else is single-line. */
  wraps?: boolean;
}

const FIELD_LABELS: FieldSpec[] = [
  { label: "Contact Person Name", canonical: "contactName" },
  { label: "Contact Person", canonical: "contactName" },
  { label: "Designation", canonical: "designation" },
  { label: "Mobile", canonical: "mobile" },
  { label: "Telephone", canonical: "phone" },
  { label: "Phone", canonical: "phone" },
  { label: "Fax", canonical: "fax" },
  { label: "Company Email", canonical: "companyEmail" },
  { label: "Contact Email", canonical: "email" },
  { label: "Email", canonical: "email" },
  { label: "Website", canonical: "website" },
  { label: "Hall No", canonical: "hallNo" },
  { label: "Stall No", canonical: "stallNo" },
  { label: "Company Profile", canonical: "companyProfile", wraps: true },
  { label: "Product Category", canonical: "productCategory", wraps: true },
  { label: "Product Categories", canonical: "productCategory", wraps: true },
];

// Longest label first, so "Company Email" wins over "Email".
const SORTED_LABELS = [...FIELD_LABELS].sort(
  (a, b) => b.label.length - a.label.length
);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LABEL_RE = new RegExp(
  `^(${SORTED_LABELS.map((f) => escapeRe(f.label)).join("|")})\\s*:\\s*(.*)$`,
  "i"
);

/** Any `Some Label:` at line start — used to spot labels not handled yet. */
const ANY_LABEL_RE = /^([A-Z][A-Za-z ./&-]{2,28})\s*:\s*(\S.*)$/;

function specFor(label: string): FieldSpec | undefined {
  const lower = label.toLowerCase();
  return SORTED_LABELS.find((f) => f.label.toLowerCase() === lower);
}

// ── Types ────────────────────────────────────────────────────

interface Line {
  x: number;
  y: number;
  text: string;
}

interface PageLines {
  lines: Line[];
  width: number;
}

export interface RawRecord {
  sourcePage: number;
  recordNo: number | null;
  companyName: string;
  addressLines: string[];
  contactName?: string;
  designation?: string;
  mobile?: string;
  phone?: string;
  fax?: string;
  email?: string;
  companyEmail?: string;
  website?: string;
  hallNo?: string;
  stallNo?: string;
  companyProfile?: string;
  productCategory?: string;
  unknownFields?: Record<string, string>;
}

export interface NormalizedLead {
  source: string;
  sourceRef: string;
  sourcePage: number;
  companyName: string;
  contactName: string | null;
  salutation: string | null;
  designation: string | null;
  email: string | null;
  companyEmail: string | null;
  mobile: string | null;
  mobileE164: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  hallNo: string | null;
  stallNo: string | null;
  companyProfile: string | null;
  productCategories: string[];
  /** Unparsed `Product Category` value, molecule lists included — the AI step reads it. */
  productCategoryRaw: string | null;
  parseWarnings: string[];

  // ── Raw-folder extractors only (spreadsheets/docs/PDFs) ──────────
  /** Every original cell of the row this lead came from, keyed by its column header. */
  rawData?: Record<string, string> | null;
  /** Which kind of evidence supplied `country` (see country-data.ts CountrySource). */
  countrySource?: string | null;
  /** Free-text notes/brief from the source ("Distributing company based in Malaysia"). */
  remarks?: string | null;
  /** What they buy/make, from Product/Item/Importing columns. */
  productInterest?: string | null;
  /** Every file/sheet this email was found in, once duplicates are merged. */
  sourceFiles?: string[];
  /** Every phone number found for this contact, across every row/file it appears in. */
  phones?: string[];
}

// ── PDF → per-page positioned lines ──────────────────────────

async function readPdf(pdfPath: string): Promise<PageLines[]> {
  // pdfjs-dist ships ESM only; the legacy build is the Node-safe entry.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;

  const pages: PageLines[] = [];

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const width = page.getViewport({ scale: 1 }).width;

    // Text items arrive in draw order with no line breaks of their own,
    // so the baseline Y is the only reliable line boundary. Rounding to
    // a half-point absorbs sub-pixel jitter without merging real lines.
    const rows = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const y = Math.round((item.transform[5] as number) * 2) / 2;
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4] as number, str: item.str });
      rows.set(y, row);
    }

    const lines: Line[] = [...rows.entries()]
      // PDF Y grows upward, so descending Y is top-to-bottom.
      .sort((a, b) => b[0] - a[0])
      .map(([y, row]) => {
        const sorted = row.sort((a, b) => a.x - b.x);
        return {
          y,
          x: sorted[0].x,
          text: repairLigatures(sorted.map((c) => c.str).join(""))
            .replace(/\s+/g, " ")
            .trim(),
        };
      })
      .filter((l) => l.text.length > 0);

    pages.push({ lines, width });
    page.cleanup();

    if (pageNo % 100 === 0) {
      process.stdout.write(`  ...read ${pageNo}/${doc.numPages} pages\n`);
    }
  }

  await doc.cleanup();
  return pages;
}

// ── Page → record ────────────────────────────────────────────

/** True for the company-name style: has letters, none of them lower-case. */
function isAllCapsLine(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return false;
  return letters === letters.toUpperCase();
}

/**
 * A `Product Category` value listing hundreds of molecules can run past
 * the bottom of the page and continue on the next one, which then has
 * no contact block of its own. An unclosed `[` is the reliable tell.
 */
function hasUnclosedBracket(value: string | undefined): boolean {
  if (!value) return false;
  const open = (value.match(/\[/g) ?? []).length;
  const close = (value.match(/\]/g) ?? []).length;
  return open > close;
}

/** Main-column text of a page, footer page-number excluded. */
function mainColumnText(page: PageLines): string {
  const splitX = page.width * 0.5;
  return page.lines
    .filter((l) => l.x < splitX && !/^\d{1,4}$/.test(l.text))
    .map((l) => l.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePage(page: PageLines, pageNo: number): RawRecord | null {
  if (page.lines.length < 4) return null;

  const record: RawRecord = {
    sourcePage: pageNo,
    recordNo: null,
    companyName: "",
    addressLines: [],
  };

  const setField = (canonical: string, value: string) => {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) return;
    if (canonical.startsWith("?")) {
      record.unknownFields ??= {};
      record.unknownFields[canonical.slice(1)] = clean;
    } else {
      (record as unknown as Record<string, string>)[canonical] = clean;
    }
  };

  // The record number is the page footer, printed alone and centred.
  const remaining: Line[] = [];
  for (const line of page.lines) {
    if (record.recordNo === null && /^\d{1,4}$/.test(line.text)) {
      record.recordNo = Number(line.text);
      continue;
    }
    remaining.push(line);
  }

  // Hall/Stall live in a right-hand column that visually starts above
  // the company name. Splitting by X keeps them out of the header block.
  const splitX = page.width * 0.5;
  const main = remaining.filter((l) => l.x < splitX);
  const side = remaining.filter((l) => l.x >= splitX);

  for (const line of side) {
    const m = line.text.match(LABEL_RE);
    if (m) setField(specFor(m[1])!.canonical, m[2]);
  }

  // Main column: an unlabelled header block (company name, then
  // address), followed by labelled fields.
  let openField: FieldSpec | null = null;
  let buffer: string[] = [];
  let seenKnownLabel = false;
  const header: string[] = [];

  const flush = () => {
    if (openField) setField(openField.canonical, buffer.join(" "));
    openField = null;
    buffer = [];
  };

  for (const line of main) {
    const known = line.text.match(LABEL_RE);
    if (known) {
      flush();
      seenKnownLabel = true;
      const spec = specFor(known[1])!;
      if (spec.wraps) {
        openField = spec;
        buffer = known[2] ? [known[2]] : [];
      } else {
        setField(spec.canonical, known[2]);
      }
      continue;
    }

    // A colon-led line inside profile prose ("companies: 1-Amtec ...")
    // is not a field, so unknown labels are only considered while no
    // wrapping field is open.
    if (!openField) {
      const unknown = line.text.match(ANY_LABEL_RE);
      // Address lines such as "Plot No: 41, MIDC" also look like
      // labels. They always precede the first real field, so unknown
      // labels only count once the labelled region has started.
      if (unknown && unknown[1].split(" ").length <= 4 && seenKnownLabel) {
        setField(`?${unknown[1].trim()}`, unknown[2]);
        continue;
      }
      header.push(line.text);
      continue;
    }

    buffer.push(line.text);
  }
  flush();

  if (header.length === 0) return null;

  // Leading run of ALL-CAPS lines is the company name; the rest is the
  // postal address. A mixed-case name falls back to the first line.
  let i = 0;
  const nameParts: string[] = [];
  while (i < header.length && isAllCapsLine(header[i])) {
    nameParts.push(header[i]);
    i++;
  }
  if (nameParts.length === 0) {
    nameParts.push(header[0]);
    i = 1;
  }

  record.companyName = nameParts.join(" ").replace(/\s+/g, " ").trim();
  record.addressLines = header.slice(i);

  return record;
}

// ── Normalisation ────────────────────────────────────────────

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function cleanEmail(value: string | undefined): string | null {
  if (!value) return null;
  // Values occasionally carry a trailing " ." or a second address.
  const match = value.match(EMAIL_RE);
  if (!match) return null;
  return match[0].toLowerCase().replace(/[.,;]+$/, "");
}

const SALUTATIONS = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Mr", "Ms", "Mrs", "Dr"];

function splitSalutation(value: string | undefined): {
  salutation: string | null;
  name: string | null;
} {
  if (!value) return { salutation: null, name: null };
  const trimmed = value.replace(/\s+/g, " ").trim();

  for (const s of SALUTATIONS) {
    if (trimmed.toLowerCase().startsWith(`${s.toLowerCase()} `)) {
      return {
        salutation: s.endsWith(".") ? s : `${s}.`,
        name: trimmed.slice(s.length).trim() || null,
      };
    }
  }
  return { salutation: null, name: trimmed || null };
}

/**
 * Best-effort E.164. Indian catalogue entries are bare 10-digit
 * mobiles, so a 10-digit number starting 6-9 gets +91; anything that
 * already carries a country code is preserved. Returns null rather
 * than guessing — a wrong number is worse than a missing one.
 */
function toE164(raw: string | undefined): string | null {
  if (!raw) return null;

  const first = raw.split(/[,/;]/)[0];
  const hasPlus = first.trim().startsWith("+");
  const digits = first.replace(/\D/g, "");
  if (digits.length < 8) return null;

  if (hasPlus) return `+${digits}`;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

/**
 * The final address line is `City, State-PIN, Country`, sometimes with
 * the city or state missing (`Shamti, Solan, 173212, India`). Anything
 * that does not match is left as a plain address string — a wrong city
 * is worse than no city when it drives segmentation.
 */
function parseAddress(lines: string[]) {
  const address = lines
    .join(", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  const parts = (lines[lines.length - 1] ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let city: string | null = null;
  let state: string | null = null;
  let postalCode: string | null = null;
  let country: string | null = null;

  if (parts.length >= 2) {
    country = parts[parts.length - 1] || null;

    const statePart = parts[parts.length - 2] ?? "";
    const withPin = statePart.match(/^(.*?)[-\s]+(\d{4,6})$/);

    if (/^\d{4,6}$/.test(statePart)) {
      // `..., Solan, 173212, India` — no state named at all.
      postalCode = statePart;
      city = parts[parts.length - 3] ?? null;
    } else if (withPin) {
      state = withPin[1].trim() || null;
      postalCode = withPin[2];
      city = parts[parts.length - 3] ?? null;
    } else {
      state = statePart || null;
      city = parts[parts.length - 3] ?? null;
    }
  }

  return { address: address || null, city, state, postalCode, country };
}

/**
 * `APIs [CARISOPRODOL, HALOPERIDOL], Intermediates, Others` →
 * ["APIs", "Intermediates", "Others"]. The bracketed molecule lists are
 * dropped here but survive in `companyProfile` for the AI step.
 */
function parseCategories(value: string | undefined): string[] {
  if (!value) return [];
  const withoutBrackets = value.replace(/\[[^\]]*\]/g, "");
  return [
    ...new Set(
      withoutBrackets
        .split(",")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter((s) => s.length > 1)
    ),
  ];
}

function normalize(record: RawRecord, source: string): NormalizedLead {
  const warnings: string[] = [];

  const { salutation, name } = splitSalutation(record.contactName);
  const email = cleanEmail(record.email);
  const companyEmail = cleanEmail(record.companyEmail);
  const { address, city, state, postalCode, country } = parseAddress(
    record.addressLines
  );

  if (!email && !companyEmail) warnings.push("no-email");
  if (record.email && !email) warnings.push(`unparsable-email:${record.email}`);
  if (!name) warnings.push("no-contact-name");
  if (!record.companyProfile) warnings.push("no-profile");
  if (record.unknownFields) {
    warnings.push(`unknown-fields:${Object.keys(record.unknownFields).join("|")}`);
  }

  return {
    source,
    sourceRef: `${source}#${record.recordNo ?? record.sourcePage}`,
    sourcePage: record.sourcePage,
    companyName: record.companyName,
    contactName: name,
    salutation,
    designation: record.designation ?? null,
    email,
    companyEmail,
    mobile: record.mobile ?? record.phone ?? null,
    mobileE164: toE164(record.mobile ?? record.phone),
    phone: record.phone ?? null,
    website: record.website ?? null,
    address,
    city,
    state,
    postalCode,
    country,
    hallNo: record.hallNo ?? null,
    stallNo: record.stallNo ?? null,
    companyProfile: record.companyProfile ?? null,
    productCategories: parseCategories(record.productCategory),
    productCategoryRaw: record.productCategory ?? null,
    parseWarnings: warnings,
  };
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  const pdfPath = path.resolve(
    process.cwd(),
    String(args.pdf ?? "docs/catalogues/iphex-2025.pdf")
  );
  const source = String(args.source ?? "iphex-2025");
  const outPath = path.resolve(
    process.cwd(),
    String(args.out ?? `scripts/leads/out/${source}.json`)
  );

  if (!fs.existsSync(pdfPath)) {
    console.error(`\n  PDF not found: ${pdfPath}\n`);
    process.exit(1);
  }

  console.log(`\n  Extracting ${path.basename(pdfPath)} -> ${source}\n`);

  const pages = await readPdf(pdfPath);
  console.log(`  ${pages.length} pages read\n`);

  const records: RawRecord[] = [];
  const skipped: number[] = [];
  const overflow: number[] = [];
  const unknownLabels = new Map<string, number>();

  pages.forEach((page, idx) => {
    const pageNo = idx + 1;
    const record = parsePage(page, pageNo);
    const isRecord =
      record && (record.contactName || record.email || record.stallNo);

    if (isRecord) {
      records.push(record);
      return;
    }

    // A page with no contact block is either front matter (cover,
    // index) or the tail of the previous record's molecule list.
    const previous = records[records.length - 1];
    if (previous && hasUnclosedBracket(previous.productCategory)) {
      previous.productCategory = `${previous.productCategory} ${mainColumnText(page)}`;
      overflow.push(pageNo);
      return;
    }

    skipped.push(pageNo);
  });

  for (const record of records) {
    for (const key of Object.keys(record.unknownFields ?? {})) {
      unknownLabels.set(key, (unknownLabels.get(key) ?? 0) + 1);
    }
  }

  const leads: NormalizedLead[] = records.map((r) => normalize(r, source));

  const noEmail = leads.filter((l) => !l.email && !l.companyEmail);
  const noName = leads.filter((l) => !l.contactName);
  const noProfile = leads.filter((l) => !l.companyProfile);
  const noCategory = leads.filter((l) => l.productCategories.length === 0);

  const emails = new Set<string>();
  let duplicateEmails = 0;
  for (const lead of leads) {
    const e = lead.email ?? lead.companyEmail;
    if (!e) continue;
    if (emails.has(e)) duplicateEmails++;
    emails.add(e);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        source,
        pdf: path.basename(pdfPath),
        extractedAt: new Date().toISOString(),
        totalPages: pages.length,
        leadCount: leads.length,
        leads,
      },
      null,
      2
    )
  );

  console.log(`  Parsed         ${leads.length} exhibitors`);
  console.log(`  Skipped        ${skipped.length} pages (cover/index/no contact block)`);
  console.log(`  Overflow       ${overflow.length} pages merged into the previous record`);
  console.log(
    `  Unique emails  ${emails.size}${duplicateEmails ? ` (+${duplicateEmails} duplicate)` : ""}`
  );
  console.log(`  Missing email  ${noEmail.length}`);
  console.log(`  Missing name   ${noName.length}`);
  console.log(`  Missing bio    ${noProfile.length}`);
  console.log(`  Missing categs ${noCategory.length}`);

  if (unknownLabels.size) {
    console.log(`\n  Unrecognised labels (add to FIELD_LABELS if useful):`);
    for (const [label, count] of [...unknownLabels].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${label}  x${count}`);
    }
  }

  console.log(`\n  Wrote ${path.relative(process.cwd(), outPath)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
