/**
 * extract-spreadsheets.ts — every contact in every .xlsx/.xls, with every
 * field the sheet actually carries, from any layout.
 *
 * Fifty-plus sheets built over a decade share no schema: headers move,
 * get renamed ("Region", "Foreign Country", "Country & Address"), repeat
 * ("Landline" + "Mobile", "ADD1" + "ADD2") or are missing altogether.
 * So instead of a fixed mapping, each sheet is understood in three steps:
 *
 *   1. HEADER SYNONYMS. Column names are matched (case/punctuation
 *      blind) to roles: company, contact, designation, email, phone,
 *      country, state, city, postal, address, website, product, remarks.
 *   2. CONTENT PROFILING. A column whose header means nothing is looked
 *      at by what it holds: cells that are country names, Indian states,
 *      phone numbers or URLs make it a country/state/phone/website
 *      column. This is what recovers headerless sheets.
 *   3. EVIDENCE LADDER for country, strongest first, recording which won:
 *      a country/region column → a country (or Indian state/city/GSTIN)
 *      in the address text → an international phone code → the sheet's
 *      own majority country (only for a sheet with no country column at
 *      all, such as a list of Haryana manufacturers). Email/website
 *      suffix and 10-digit mobiles are applied later in the merge step.
 *
 * Nothing is thrown away: the complete original row is kept as `rawData`
 * (header → cell), so a field nobody thought to map — price, quantity,
 * licence number, previous email status — is still on the lead.
 *
 * A row with no email produces nothing (shipment data, certificates of
 * analysis). Rows with several emails yield one lead each.
 */

import * as path from "node:path";
import type { NormalizedLead } from "./extract-catalog";
import {
  compact,
  emptyLead,
  extractEmails,
  extractPhones,
  phoneKey,
  findPhone,
  findWebsite,
  looksLikeNameCandidate,
  slugify,
  toE164,
} from "./raw-shared";
import {
  countryFromCell,
  countryFromDomain,
  countryFromPhone,
  countryFromText,
  hasGstin,
  looksIndian,
  type CountrySource,
} from "./country-data";

const set = (...v: string[]) => new Set(v.map(compact));

const COMPANY_HEADERS = set(
  "company name", "company", "importer", "client name", "buyer", "buyer name", "foreign company",
  "party name", "name of the party", "name of org", "consinee name", "organisation", "organization",
  "name of party", "org name", "business name", "indian company", "foreign co", "name",
  "name of company", "customer name", "customer", "fbo company name", "coname", "co name"
);
const CONTACT_HEADERS = set(
  "contact person", "contact person name", "contect person name", "contact name", "person",
  "from name", "to name", "contacted person", "contact person id", "person name", "contact",
  "director", "client poc", "client contact person", "representative"
);
const EMAIL_HEADERS = set(
  "email", "email id", "email address", "contact email", "from address", "to address",
  "client email id", "email and website", "email and website address", "email id and website address",
  "telephone no and email", "mail id", "e mail", "mail", "cc address", "bcc address"
);
const PHONE_HEADERS = set(
  "phone", "mobile", "contact no", "contact number", "telephone", "tel", "phn no", "ph no", "landline",
  "p no", "phone no", "mobile no", "contact details", "telephone no", "contact no details",
  "client contact no", "phone number", "mobile number", "tel no", "telephone number"
);
const COUNTRY_HEADERS = set("country", "foreign country", "country name", "region", "nation", "country region");
const STATE_HEADERS = set("state", "province", "state name", "state province");
const CITY_HEADERS = set("city", "town", "city name");
const POSTAL_HEADERS = set("zip", "zip code", "pin", "pin code", "pincode", "postal code", "postcode");
const ADDRESS_HEADERS = set(
  "address", "add", "country address", "location", "add1", "add2", "add3", "address1", "address2",
  "address3", "premises address", "addresss", "addresses", "street address", "addr"
);
const WEBSITE_HEADERS = set("website", "web", "url", "web url", "site");
const DESIGNATION_HEADERS = set("designation", "job title", "position");
const PRODUCT_HEADERS = set(
  "product", "products", "item", "items", "main products", "product dealing", "importing",
  "product description", "product name", "function", "product category", "business category", "type of oil"
);
const REMARKS_HEADERS = set("comments", "remarks", "remark", "reamrks", "breif", "brief", "notes", "note", "description");
// Never used for anything: message text and mail-client plumbing.
const IGNORED_HEADERS = set(
  "subject", "body", "message", "categories", "importance", "mileage", "sensitivity",
  "billing information", "intro mail", "from type", "to type", "cc type", "bcc type",
  "cc name", "bcc name"
);

export type Role =
  | "company" | "contact" | "email" | "phone" | "country" | "state" | "city" | "postal"
  | "address" | "website" | "designation" | "product" | "remarks" | "ignored";

export function roleFor(header: string): Role | null {
  const raw = String(header ?? "");
  // Korean "주 소" (address) has no letters compact() would keep.
  if (raw.replace(/\s+/g, "") === "주소") return "address";
  const c = compact(raw);
  if (!c) return null;
  if (IGNORED_HEADERS.has(c)) return "ignored";
  if (EMAIL_HEADERS.has(c)) return "email";
  if (COUNTRY_HEADERS.has(c)) return "country";
  if (STATE_HEADERS.has(c)) return "state";
  if (CITY_HEADERS.has(c)) return "city";
  if (POSTAL_HEADERS.has(c)) return "postal";
  if (COMPANY_HEADERS.has(c)) return "company";
  if (PHONE_HEADERS.has(c)) return "phone";
  if (CONTACT_HEADERS.has(c)) return "contact";
  if (ADDRESS_HEADERS.has(c)) return "address";
  if (WEBSITE_HEADERS.has(c)) return "website";
  if (DESIGNATION_HEADERS.has(c)) return "designation";
  if (PRODUCT_HEADERS.has(c)) return "product";
  if (REMARKS_HEADERS.has(c)) return "remarks";
  return null;
}

// ── Column profiling ─────────────────────────────────────────

const PHONE_CELL = /^[+(]?\d[\d\s().+\-/,]{6,}$/;
const URL_CELL = /^(https?:\/\/|www\.)\S+$/i;

/** Gives a role to columns whose header said nothing, by what their cells hold. */
function profileColumns(rows: unknown[][], startRow: number, roles: (Role | null)[], width: number): (Role | null)[] {
  const out = [...roles];
  while (out.length < width) out.push(null);

  const sampleOf = (col: number) => {
    const sample: string[] = [];
    for (let r = startRow; r < rows.length && sample.length < 300; r++) {
      const v = String(rows[r]?.[col] ?? "").trim();
      if (v && !JUNK.test(v)) sample.push(v);
    }
    return sample;
  };
  const shareOf = (sample: string[], test: (v: string) => boolean) => sample.filter(test).length / sample.length;

  // Pass 1 — a header is a claim, the cells are the evidence. Some sheets
  // are shifted a column against their header ("Country" holding email
  // addresses, "Email Id" holding phone numbers); trusting the header there
  // would file an email as a country. Where the cells plainly contradict
  // the header, the header is dropped.
  for (let col = 0; col < width; col++) {
    const role = out[col];
    if (role !== "country" && role !== "phone" && role !== "website" && role !== "state" && role !== "email") continue;
    const sample = sampleOf(col);
    if (sample.length < 5) continue;
    // A plain "@" test, not extractEmails(): that drops the mailbox's own
    // address, which made an archive's To column look like it held no emails.
    const isEmail = shareOf(sample, (v) => v.includes("@"));
    const isPhone = shareOf(sample, (v) => PHONE_CELL.test(v) && v.replace(/\D/g, "").length >= 8);
    const fits =
      role === "email"
        ? 1
        : role === "country"
        ? shareOf(sample, (v) => v.length <= 30 && (countryFromCell(v) !== null || looksIndian(v)))
        : role === "phone"
          ? shareOf(sample, (v) => /\d{6,}/.test(v.replace(/[\s().+-]/g, "")))
          : role === "website"
            ? shareOf(sample, (v) => URL_CELL.test(v) || /\.[a-z]{2,}$/i.test(v))
            : shareOf(sample, (v) => v.length <= 30);
    // An email column is only reclassified when it plainly holds phone numbers.
    if (role === "email") {
      if (isEmail < 0.1 && isPhone >= 0.6) out[col] = null;
    } else if (isEmail >= 0.5 || fits < 0.25) {
      out[col] = null;
    }
  }

  const has = (r: Role) => out.includes(r);

  // Pass 2 — give a role to columns whose header said nothing (or was dropped).
  for (let col = 0; col < width; col++) {
    if (out[col] !== null) continue;
    const sample = sampleOf(col);
    if (sample.length < 5) continue;
    const share = (test: (v: string) => boolean) => shareOf(sample, test);

    if (!has("country") && share((v) => v.length <= 30 && countryFromCell(v) !== null) >= 0.6) {
      out[col] = "country";
    } else if (!has("state") && share((v) => v.length <= 25 && looksIndian(v)) >= 0.6) {
      out[col] = "state";
    } else if (!has("phone") && share((v) => PHONE_CELL.test(v) && v.replace(/\D/g, "").length >= 8) >= 0.7) {
      out[col] = "phone";
    } else if (!has("website") && share((v) => URL_CELL.test(v)) >= 0.6) {
      out[col] = "website";
    }
  }
  return out;
}

// ── One sheet ────────────────────────────────────────────────

interface Draft {
  lead: NormalizedLead;
  country: string | null;
}

interface SheetResult {
  leads: NormalizedLead[];
  headerless: number;
  dataRows: number;
  rowsUsed: number;
  withCountry: number;
  /** Country applied to rows with no evidence of their own, when the sheet clearly is about one country. */
  defaultCountry: string | null;
  /** Rows kept as contacts although they have no email — a name and a phone number. */
  phoneOnlyRows: number;
  /** Emails found only inside mail-message text. */
  bodyEmailLeads: number;
}

const JUNK = /^(na|n\/a|nil|none|null|-|—|\.|\?)$/i;
const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const uniq = (values: string[]) => [...new Set(values.filter((v) => v && !JUNK.test(v)))];

function extractSheet(
  rows: unknown[][],
  source: string,
  sheetLabel: string,
  sheetName: string,
  fileName: string
): SheetResult {
  const drafts: Draft[] = [];
  let headerless = 0;
  let dataRows = 0;
  let rowsUsed = 0;
  let phoneOnlyRows = 0;
  let bodyEmailLeads = 0;

  // Header row: first of the top five that names an email column, or a company + contact pair.
  let headerRowIdx = -1;
  let roles: (Role | null)[] = [];
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const rowRoles = (rows[r] ?? []).map((cell) => roleFor(String(cell ?? "")));
    const hits = rowRoles.filter((x) => x !== null).length;
    const named = rowRoles.includes("email") || (rowRoles.includes("company") && rowRoles.includes("contact"));
    if (hits >= 1 && named) {
      headerRowIdx = r;
      roles = rowRoles;
      break;
    }
  }

  const width = rows.reduce((m, r) => Math.max(m, r?.length ?? 0), 0);
  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  roles = profileColumns(rows, startRow, roles, width);

  const headerCells = headerRowIdx >= 0 ? (rows[headerRowIdx] ?? []).map(clean) : [];
  const labelFor = (i: number) => headerCells[i] || `column ${i + 1}`;

  const emailCols = roles.reduce<number[]>((acc, r, i) => (r === "email" ? [...acc, i] : acc), []);
  const hasBodyCol = headerRowIdx >= 0 && (rows[headerRowIdx] ?? []).some((c) => compact(String(c ?? "")) === "body");
  const hasCompanyCol = roles.includes("company");
  const hasCountryCol = roles.includes("country");
  // Merged company cells leave every row but the first blank; carry the last real one forward.
  let lastCompanyName: string | null = null;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (row.every((c) => c === "" || c === null || c === undefined)) continue;
    dataRows++;

    // An email-archive sheet (has a Body column) is scanned only in its address columns.
    const cellsToScan = hasBodyCol && emailCols.length > 0 ? emailCols.map((i) => row[i]) : row;
    const emails = new Set<string>();
    for (const cell of cellsToScan) for (const e of extractEmails(cell as string)) emails.add(e);

    // ── Everything the row says, by role ─────────────────────
    const vals: Record<Role, string[]> = {
      company: [], contact: [], email: [], phone: [], country: [], state: [], city: [], postal: [],
      address: [], website: [], designation: [], product: [], remarks: [], ignored: [],
    };
    const raw: Record<string, string> = {};
    row.forEach((cell, i) => {
      const v = clean(cell);
      if (!v) return;
      const role = roles[i] ?? null;
      if (role) vals[role].push(v);
      if (role === "ignored" || Object.keys(raw).length >= 40) return;
      let label = labelFor(i);
      while (label in raw) label += "_";
      raw[label] = v.slice(0, 300);
    });
    raw["__file"] = fileName;
    raw["__sheet"] = sheetName;
    raw["__row"] = String(r + 1);

    // Every number on the row: phone columns are trusted outright; anywhere
    // else (address, remarks, unlabelled columns) a number needs a "+", a
    // Tel:/Mob: label or the shape of an Indian mobile, or it is a postal
    // code / HS code / licence number.
    const phoneList: string[] = [];
    const seenPhones = new Set<string>();
    const addPhones = (found: string[]) => {
      for (const ph of found) {
        const key = phoneKey(ph);
        if (!seenPhones.has(key)) {
          seenPhones.add(key);
          phoneList.push(ph);
        }
      }
    };
    if (!hasBodyCol) {
      for (const cell of vals.phone) addPhones(extractPhones(cell, { trusted: true }));
      row.forEach((cell, i) => {
        const role = roles[i] ?? null;
        if (role === "phone" || role === "email" || role === "ignored" || role === "company" || role === "contact") return;
        addPhones(extractPhones(cell));
      });
    }

    const address = uniq(vals.address).join(", ") || null;
    const city = uniq(vals.city)[0] ?? null;
    const state = uniq(vals.state)[0] ?? null;
    const postal = uniq(vals.postal)[0] ?? null;

    // ── Country: strongest evidence first ────────────────────
    let country: string | null = null;
    let countrySource: CountrySource | null = null;
    for (const cell of vals.country) {
      // A country column that says "Delhi" or "Uttar Pradesh" still says India.
      const c = countryFromCell(cell) ?? (looksIndian(cell) ? "India" : null);
      if (c) {
        country = c;
        countrySource = "country-column";
        break;
      }
    }
    const locationText = [address, city, state, postal].filter(Boolean).join(", ");
    if (!country && locationText) {
      const c = countryFromText(locationText);
      if (c) {
        country = c;
        countrySource = "address-text";
      } else if (looksIndian(locationText)) {
        country = "India";
        countrySource = "indian-address";
      }
    }
    if (!country && !hasBodyCol && hasGstin(Object.values(raw).join(" "))) {
      country = "India";
      countrySource = "indian-address";
    }
    if (!country) {
      for (const p of phoneList) {
        const c = countryFromPhone(p);
        if (c) {
          country = c;
          countrySource = "phone-code";
          break;
        }
      }
    }

    // ── Who, what ────────────────────────────────────────────
    let companyName: string | null = uniq(vals.company)[0] ?? null;
    let companyGuessed = false;
    let companyCarried = false;
    if (companyName) {
      lastCompanyName = companyName;
    } else if (hasCompanyCol && lastCompanyName) {
      companyName = lastCompanyName;
      companyCarried = true;
    } else if (!hasBodyCol) {
      // No company column: guess from the longest plausible cell in a column that has no role.
      let best = "";
      row.forEach((cell, i) => {
        if (roles[i]) return;
        const v = clean(cell);
        if (!v || !looksLikeNameCandidate(v)) return;
        if ([...emails].some((e) => v.toLowerCase().includes(e))) return;
        if (v.length > best.length) best = v;
      });
      if (best) {
        companyName = best;
        companyGuessed = true;
      }
    }

    const rowText = row.map((c) => String(c ?? "")).join(" ");
    const website = uniq(vals.website).find((w) => !w.includes("@")) ?? findWebsite(rowText);
    const phone = phoneList[0] ?? (hasBodyCol ? null : findPhone(rowText));
    const mobile = phoneList.find((p) => /^[6-9]\d{9}$/.test(p.replace(/\D/g, ""))) ?? phone;
    const remarks = uniq(vals.remarks).join(" · ").slice(0, 500) || null;
    const productInterest = uniq(vals.product).join("; ").slice(0, 300) || null;

    // A row with no email is still a contact if it names someone and has a
    // phone number (a courier list, a licence register, a no-email sheet).
    const phoneOnly = emails.size === 0;
    const displayName = uniq(vals.company)[0] ?? uniq(vals.contact)[0] ?? null;
    if (phoneOnly && (hasBodyCol || phoneList.length === 0 || !displayName)) continue;
    rowsUsed++;
    if (headerRowIdx < 0) headerless++;

    if (phoneOnly) {
      phoneOnlyRows++;
      drafts.push({
        country,
        lead: emptyLead({
          source,
          sourceRef: `${source}#${sheetLabel}-r${r}p`,
          companyName: displayName!,
          contactName: uniq(vals.contact)[0] ?? null,
          designation: uniq(vals.designation)[0] ?? null,
          email: null,
          mobile,
          mobileE164: toE164(mobile),
          phone,
          phones: phoneList,
          website: website ?? null,
          address,
          city,
          state,
          postalCode: postal,
          country,
          companyProfile: remarks,
          productCategoryRaw: productInterest,
          remarks,
          productInterest,
          countrySource,
          rawData: raw,
          parseWarnings: ["no-email"],
        }),
      });
      continue;
    }

    let i = 0;
    for (const email of emails) {
      const domain = email.slice(email.indexOf("@") + 1);
      const warnings: string[] = [];
      if (companyGuessed) warnings.push("company-name-guessed");
      if (companyCarried) warnings.push("company-name-carried-forward");
      if (!companyName) warnings.push("company-name-from-domain");
      if (headerRowIdx < 0) warnings.push("headerless-sheet");

      drafts.push({
        country,
        lead: emptyLead({
          source,
          sourceRef: `${source}#${sheetLabel}-r${r}${emails.size > 1 ? `-${i}` : ""}`,
          companyName: companyName ?? `Unknown — ${domain}`,
          contactName: uniq(vals.contact)[0] ?? null,
          designation: uniq(vals.designation)[0] ?? null,
          email,
          mobile,
          mobileE164: toE164(mobile),
          phone,
          phones: phoneList,
          website: website ?? null,
          address,
          city,
          state,
          postalCode: postal,
          country,
          companyProfile: remarks,
          productCategoryRaw: productInterest,
          remarks,
          productInterest,
          countrySource,
          rawData: raw,
          parseWarnings: warnings,
        }),
      });
      i++;
    }

    // Mail archive: addresses quoted inside the message text (signatures,
    // forwarded chains) are real contacts too. Kept apart under their own
    // "-body" source so they can be filtered out of a campaign if unwanted.
    if (hasBodyCol) {
      const bodyIdx = headerCells.findIndex((h) => compact(h) === "body");
      const inBody = extractEmails(row[bodyIdx] as string).filter((e) => !emails.has(e));
      let b = 0;
      for (const email of inBody) {
        const domain = email.slice(email.indexOf("@") + 1);
        drafts.push({
          country: null,
          lead: emptyLead({
            source: `${source}-body`,
            sourceRef: `${source}-body#${sheetLabel}-r${r}-${b++}`,
            companyName: `Unknown — ${domain}`,
            email,
            countrySource: null,
            rawData: { __file: fileName, __sheet: sheetName, __row: String(r + 1), __found_in: "mail body" },
            parseWarnings: ["company-name-from-domain", "from-mail-body"],
          }),
        });
      }
      bodyEmailLeads += inBody.length;
    }
  }

  // ── Sheet consensus ─────────────────────────────────────────
  // A sheet with no country column that is overwhelmingly one country
  // (Haryana manufacturers, an Indian licence register) is about that
  // country: rows with no evidence of their own inherit it. Never done
  // for a sheet that has a country column — blank there means unknown.
  let defaultCountry: string | null = null;
  if (!hasBodyCol) {
    const tally = new Map<string, number>();
    for (const d of drafts) if (d.country) tally.set(d.country, (tally.get(d.country) ?? 0) + 1);
    const resolved = [...tally.values()].reduce((a, b) => a + b, 0);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    // With a country column, blanks mean "unknown" unless the column is
    // near-unanimous (a sheet of Indian buyers where a few cells were left empty).
    const needed = hasCountryCol ? 0.9 : 0.6;
    if (top && resolved >= (hasCountryCol ? 5 : 3) && top[1] / resolved >= needed && resolved / Math.max(drafts.length, 1) >= 0.15) {
      defaultCountry = top[0];
      for (const d of drafts) {
        if (d.country) continue;
        // A row whose own email/website domain names a country keeps that
        // clue (applied later) instead of inheriting the sheet's guess.
        if (countryFromDomain(d.lead.email) || countryFromDomain(d.lead.website)) continue;
        d.country = defaultCountry;
        d.lead.country = defaultCountry;
        d.lead.countrySource = "sheet-majority";
      }
    }
  }

  return {
    leads: drafts.map((d) => d.lead),
    headerless,
    dataRows,
    rowsUsed,
    withCountry: drafts.filter((d) => d.country).length,
    defaultCountry,
    phoneOnlyRows,
    bodyEmailLeads,
  };
}

export interface SheetBreakdown {
  sheet: string;
  /** Non-blank data rows below the header. */
  dataRows: number;
  /** Of those, how many had an email and became at least one lead. */
  rowsUsed: number;
  /** dataRows - rowsUsed: no email found anywhere in the row. */
  rowsSkipped: number;
  leadsFound: number;
  /** Leads from this sheet with a country identified from the sheet's own content. */
  withCountry: number;
  /** Set when the sheet's own majority country was applied to rows with no evidence of their own. */
  defaultCountry: string | null;
  /** Rows with no email kept as contacts (name + phone). */
  phoneOnlyRows: number;
  /** Emails found only inside mail-message text (archive sheets). */
  bodyEmailLeads: number;
}

export interface SpreadsheetReport {
  file: string;
  ok: boolean;
  error?: string;
  sheets: number;
  rowsScanned: number;
  leadsFound: number;
  /** Per-sheet detail — a workbook with ten sheets can have nine that are useless and one that isn't. */
  sheetBreakdown: SheetBreakdown[];
}

export async function extractSpreadsheets(
  files: string[]
): Promise<{ leads: NormalizedLead[]; reports: SpreadsheetReport[] }> {
  const XLSX = (await import("xlsx")) as unknown as typeof import("xlsx") & {
    default?: typeof import("xlsx");
  };
  const xlsx = XLSX.default ?? XLSX;
  const leads: NormalizedLead[] = [];
  const reports: SpreadsheetReport[] = [];

  for (const filePath of files) {
    const base = path.basename(filePath);
    const fileSlug = slugify(base);
    const report: SpreadsheetReport = {
      file: base,
      ok: true,
      sheets: 0,
      rowsScanned: 0,
      leadsFound: 0,
      sheetBreakdown: [],
    };

    try {
      const wb = xlsx.readFile(filePath, { cellDates: true, WTF: false });
      report.sheets = wb.SheetNames.length;

      for (const sheetName of wb.SheetNames) {
        const rows = xlsx.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
          header: 1,
          defval: "",
          blankrows: false,
          raw: false,
        });
        report.rowsScanned += rows.length;

        const source = `xls-${fileSlug}`;
        const res = extractSheet(rows, source, slugify(sheetName) || "sheet", sheetName, base);
        leads.push(...res.leads);
        report.leadsFound += res.leads.length;
        report.sheetBreakdown.push({
          sheet: sheetName,
          dataRows: res.dataRows,
          rowsUsed: res.rowsUsed,
          rowsSkipped: res.dataRows - res.rowsUsed,
          leadsFound: res.leads.length,
          withCountry: res.withCountry,
          defaultCountry: res.defaultCountry,
          phoneOnlyRows: res.phoneOnlyRows,
          bodyEmailLeads: res.bodyEmailLeads,
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
