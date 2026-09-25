/**
 * raw-shared.ts — helpers shared by extract-raw-folder.ts across every
 * file format it reads (spreadsheets, Word docs, slides, ad-hoc PDFs).
 *
 * These files were never designed as contact databases — they are years
 * of sales team exports, customs records, email archives and one-off
 * lists, each shaped differently. The one thing they have in common is
 * that a real lead always has a real email address in it somewhere, so
 * every extractor here works the same way: find every email address,
 * then make the best possible guess at who it belongs to.
 */

import type { NormalizedLead } from "./extract-catalog";

// ── Email matching ───────────────────────────────────────────

// Global (not single-match) version of extract-catalog's EMAIL_RE, since
// one cell/line here can legitimately hold several addresses
// ("info@x.com, sales@x.com, Web: x.com").
export const EMAIL_RE_G = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Never treated as a lead: PuraVida's own mailboxes, the predecessor
// company's operational domain, and generic non-person addresses that
// show up constantly in email-archive exports and template files.
const EXCLUDE_EXACT = new Set([
  "rk@puravidanaturalindia.com",
  "ps@puravidanaturalindia.com",
  "exports@puravidanaturalindia.com",
]);
const EXCLUDE_DOMAINS = new Set([
  "puravidanaturalindia.com",
  "dolphin-india.com",
  "example.com",
  "example.org",
  "test.com",
  "domain.com",
  "yourcompany.com",
  "yourdomain.com",
  "company.com",
  "sample.com",
  "email.com",
  "somemail.com",
  "sentry.io",
  "sentry-next.wixpress.com",
]);
const EXCLUDE_LOCALPARTS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "postmaster",
  "mailer-daemon",
  "webmaster",
  "abuse",
]);
// Regex false-positives from filenames/asset URLs embedded in text
// ("logo@2x.png") — the email pattern's TLD group happily matches them.
const EXCLUDE_TLDS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "css", "js", "ico", "webp", "bmp",
]);

/**
 * Addresses that matched the email pattern but were deliberately not made
 * leads, by reason — so "I don't want to miss any email" can be answered
 * with exactly what was left out and why, rather than a silent filter.
 */
export const excludedEmails = new Map<string, Set<string>>();

/** Every plausible, non-excluded email address in a blob of text, lowercased and de-duplicated in order of first appearance. */
export function extractEmails(text: string | number | null | undefined): string[] {
  if (text === null || text === undefined) return [];
  const str = String(text);
  const found = str.match(EMAIL_RE_G);
  if (!found) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of found) {
    const email = raw.toLowerCase().replace(/[.,;]+$/, "");
    if (seen.has(email)) continue;
    seen.add(email);

    const skip = (reason: string) => {
      excludedEmails.set(reason, (excludedEmails.get(reason) ?? new Set()).add(email));
    };
    if (EXCLUDE_EXACT.has(email)) {
      skip("PuraVida's own mailboxes");
      continue;
    }
    const at = email.lastIndexOf("@");
    const domain = email.slice(at + 1);
    const local = email.slice(0, at);
    if (EXCLUDE_DOMAINS.has(domain)) {
      skip(domain.includes("puravida") || domain.includes("dolphin") ? "own / predecessor company domains" : "placeholder domains (example.com…)");
      continue;
    }
    if (EXCLUDE_LOCALPARTS.has(local)) {
      skip("no-reply / postmaster style addresses");
      continue;
    }
    const tld = domain.slice(domain.lastIndexOf(".") + 1);
    if (EXCLUDE_TLDS.has(tld)) {
      skip("file names that only look like emails (logo@2x.png)");
      continue;
    }
    if (email.length > 254) continue;

    out.push(email);
  }
  return out;
}

// ── Text/heuristic helpers ───────────────────────────────────

/** Lowercase, trim, and strip everything but letters/digits — turns "E -mail ID" and "email id" into the same key so header synonyms only need to be listed once. */
export function compact(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Reverses a lead's `source` tag back to the original file name it came
 * from, using the file list logged for it in `data_ingestion_runs`.
 *
 * Not a straight lookup: spreadsheet leads carry a plain `xls-<slug>`
 * source, but a PDF or PowerPoint lead's source has the page/slide
 * number baked in too (`pdf-<slug>-p12`, `doc-<slug>-slide3`) — see
 * extract-documents.ts and extract-pdfs-generic.ts, which pass that
 * suffixed string as the source for every lead from that section. Used
 * by the campaign report to point a bounced address back at the file
 * to go re-check, via `npm run leads:extract-raw -- --file "<name>"`.
 */
export function resolveSourceFile(source: string, ingestionFiles: { file: string }[]): string | null {
  const match = source.match(/^(xls|doc|pdf)-(.+?)(?:-(?:slide|p)\d+|-body)?$/);
  if (!match) return null;
  const [, , stripped] = match;
  const found = ingestionFiles.find((f) => slugify(f.file) === stripped);
  return found?.file ?? null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const URL_RE = /\bhttps?:\/\/[^\s,;<>"')]+|\bwww\.[^\s,;<>"')]+/i;
export function findWebsite(text: string): string | null {
  const m = text.match(URL_RE);
  return m ? m[0].replace(/[.,;]+$/, "") : null;
}

const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/;
export function findPhone(text: string): string | null {
  const m = text.match(PHONE_RE);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return m[1].trim();
}

/**
 * Best-effort E.164, same rule extract-catalog.ts uses for the IPHEX
 * catalogue: a bare 10-digit Indian mobile gets +91, a number that
 * already carries a country code is preserved, anything ambiguous
 * returns null rather than guessing. Feeds classifyMarket() in
 * src/lib/leads.ts when a row has a phone number but no country at
 * all — common in these spreadsheets.
 */
export function toE164(raw: string | null | undefined): string | null {
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

// A leading house number ("22, SITE IV") or a trailing street suffix
// ("... Altefähre 24-26") reads as an address line, not a name — a
// common false positive when guessing a company name from row text.
const ADDRESS_LIKE_RE = /^\d+[,.\s]|\b(strasse|straße|str\.|street|road|avenue|highway|floor|plot\s*no)\b/i;

/** True for text that is plausibly a person/company name — not empty, not a phone/email/URL, not absurdly long, no line breaks, not address-shaped. */
export function looksLikeNameCandidate(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 100) return false;
  if (/[\r\n]/.test(t)) return false;
  if (EMAIL_RE_G.test(t)) return false;
  EMAIL_RE_G.lastIndex = 0;
  if (URL_RE.test(t)) return false;
  if (/^[\d\s().+-]+$/.test(t)) return false; // pure phone/number
  if (!/[A-Za-z]{2,}/.test(t)) return false;
  if (ADDRESS_LIKE_RE.test(t)) return false;
  return true;
}

/** How many real (non-fallback) fields a lead has filled in — used to pick a winner when the same email shows up in several files. */
export function richness(lead: NormalizedLead): number {
  let score = 0;
  if (lead.companyName && !lead.companyName.startsWith("Unknown")) score++;
  if (lead.contactName) score++;
  if (lead.designation) score++;
  if (lead.mobile || lead.phone) score++;
  if (lead.website) score++;
  if (lead.address) score++;
  if (lead.country) score++;
  if (lead.companyProfile) score++;
  if (lead.email && lead.companyEmail) score++;
  return score;
}

const CONTACT_LABEL_RE = /^(contact\s*person|contact|attn\.?|kind\s*attn\.?)\s*[:.]?\s*(.+)$/i;

/**
 * Turns a flat list of lines (a document's paragraphs, or a PDF page's
 * text lines) into leads: every line with an email anchors one, and the
 * company/contact name is guessed by looking a few lines back for
 * something that reads like a name rather than an address/phone/label.
 * Shared by extract-documents.ts and extract-pdfs-generic.ts.
 */
export interface LineExtractionResult {
  leads: NormalizedLead[];
  /** Non-empty lines handed in. */
  totalLines: number;
  /** Of those, how many carried at least one email. */
  linesWithEmail: number;
}

export function extractFromLines(lines: string[], source: string): LineExtractionResult {
  const leads: NormalizedLead[] = [];
  let linesWithEmail = 0;

  lines.forEach((line, i) => {
    const emails = extractEmails(line);
    if (emails.length === 0) return;
    linesWithEmail++;

    let companyName: string | null = null;
    let contactName: string | null = null;
    for (let back = i - 1; back >= Math.max(0, i - 6); back--) {
      const candidate = lines[back]?.trim();
      if (!candidate) continue;
      const contactMatch = candidate.match(CONTACT_LABEL_RE);
      if (contactMatch && !contactName) {
        contactName = contactMatch[2].trim() || null;
        continue;
      }
      if (!companyName && looksLikeNameCandidate(candidate) && !/^(phone|tel|fax|mobile|email|web)/i.test(candidate)) {
        companyName = candidate;
        break;
      }
    }

    const windowText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(" ");
    const website = findWebsite(windowText);
    // Every labelled/international number around the address, not just the first.
    const phones = extractPhones(lines.slice(Math.max(0, i - 4), Math.min(lines.length, i + 4)).join(" \n "));
    const phone = phones[0] ?? findPhone(lines[i]) ?? findPhone(windowText);
    const context = lines.slice(Math.max(0, i - 6), Math.min(lines.length, i + 2)).join(" , ");
    const place = countryFromContext(context, phone);

    emails.forEach((email, idx) => {
      const domain = email.slice(email.indexOf("@") + 1);
      const warnings: string[] = [];
      if (!companyName) warnings.push("company-name-from-domain");

      leads.push(
        emptyLead({
          source,
          sourceRef: `${source}#L${i}${emails.length > 1 ? `-${idx}` : ""}`,
          companyName: companyName ?? `Unknown — ${domain}`,
          contactName,
          email,
          mobile: phone,
          mobileE164: toE164(phone),
          phone,
          phones: phones.length ? phones : phone ? [phone] : [],
          website,
          country: place?.country ?? null,
          countrySource: place?.source ?? null,
          rawData: { __context: context.slice(0, 300) },
          parseWarnings: warnings,
        })
      );
    });
  });

  // Entries with a phone number but no email anywhere near them (a courier
  // address list, a buyers-by-country page). Consecutive phone lines are
  // one entry; the name is found the same way as above, looking back.
  const hasEmailNear = (i: number) => {
    for (let k = Math.max(0, i - 4); k <= Math.min(lines.length - 1, i + 4); k++) {
      if (extractEmails(lines[k]).length) return true;
    }
    return false;
  };
  let lastPhoneLine = -10;
  let current: { first: number; phones: string[] } | null = null;
  const closeEntry = () => {
    if (!current) return;
    const { first, phones } = current;
    current = null;
    let companyName: string | null = null;
    let contactName: string | null = null;
    const addressLines: string[] = [];
    for (let back = first - 1; back >= Math.max(0, first - 7); back--) {
      const candidate = lines[back]?.trim();
      if (!candidate) continue;
      const contactMatch = candidate.match(CONTACT_LABEL_RE);
      if (contactMatch && !contactName) {
        contactName = contactMatch[2].trim() || null;
        continue;
      }
      if (extractPhones(candidate).length) break; // previous entry
      if (!companyName && looksLikeNameCandidate(candidate) && !/^(phone|tel|fax|mobile|email|web|kind attn)/i.test(candidate)) {
        companyName = candidate;
        break;
      }
      addressLines.unshift(candidate);
    }
    const name = companyName ?? contactName;
    if (!name) return;
    const context = [name, ...addressLines, phones.join(" ")].join(" , ");
    const place = countryFromContext(context, phones[0]);
    leads.push(
      emptyLead({
        source,
        sourceRef: `${source}#L${first}p`,
        companyName: name,
        contactName,
        email: null,
        mobile: phones[0],
        mobileE164: toE164(phones[0]),
        phone: phones[0],
        phones,
        address: addressLines.join(", ") || null,
        country: place?.country ?? null,
        countrySource: place?.source ?? null,
        rawData: { __context: context.slice(0, 300) },
        parseWarnings: ["no-email"],
      })
    );
  };
  lines.forEach((line, i) => {
    const found = extractPhones(line);
    if (found.length === 0 || hasEmailNear(i)) return;
    if (current && i - lastPhoneLine <= 2) {
      current.phones.push(...found.filter((f) => !current!.phones.some((q) => phoneKey(q) === phoneKey(f))));
    } else {
      closeEntry();
      current = { first: i, phones: [...found] };
    }
    lastPhoneLine = i;
  });
  closeEntry();

  return { leads, totalLines: lines.length, linesWithEmail };
}

export function emptyLead(overrides: Partial<NormalizedLead> & {
  source: string;
  sourceRef: string;
  companyName: string;
}): NormalizedLead {
  return {
    sourcePage: 0,
    contactName: null,
    salutation: null,
    designation: null,
    email: null,
    companyEmail: null,
    mobile: null,
    mobileE164: null,
    phone: null,
    website: null,
    address: null,
    city: null,
    state: null,
    postalCode: null,
    country: null,
    hallNo: null,
    stallNo: null,
    companyProfile: null,
    productCategories: [],
    productCategoryRaw: null,
    parseWarnings: [],
    ...overrides,
  };
}

// ── Country: last-resort evidence, and merging duplicates ────────

import {
  countryFromCompanyName,
  countryFromDomain,
  countryFromPhone,
  countryFromText,
  looksIndian,
  looksLikeIndianMobile,
} from "./country-data";

/** How much to trust each kind of country evidence when the same email appears more than once. */
const COUNTRY_STRENGTH: Record<string, number> = {
  source: 9,
  "country-column": 8,
  "address-text": 7,
  "indian-address": 6,
  "phone-code": 5,
  "sheet-majority": 4,
  "email-domain": 3,
  "website-domain": 2,
  "company-name": 1.5,
  "phone-10-digit": 1,
};

/**
 * Weakest evidence, applied only when nothing in the source said where
 * a company is: the country suffix of their email or website, then a
 * bare 10-digit number (almost always an Indian mobile). A plain .com
 * with no other clue stays unknown rather than guessed.
 */
export function finalizeCountry(lead: NormalizedLead): NormalizedLead {
  if (lead.country) return lead;
  const byEmail = countryFromDomain(lead.email) ?? countryFromDomain(lead.companyEmail);
  if (byEmail) {
    lead.country = byEmail;
    lead.countrySource = "email-domain";
    return lead;
  }
  const byWebsite = countryFromDomain(lead.website);
  if (byWebsite) {
    lead.country = byWebsite;
    lead.countrySource = "website-domain";
    return lead;
  }
  const byName = countryFromCompanyName(lead.companyName);
  if (byName) {
    lead.country = byName;
    lead.countrySource = "company-name";
    return lead;
  }
  if (looksLikeIndianMobile(lead.mobile ?? lead.phone)) {
    lead.country = "India";
    lead.countrySource = "phone-10-digit";
  }
  return lead;
}

const FILL_FIELDS = [
  "contactName",
  "designation",
  "phone",
  "mobile",
  "mobileE164",
  "website",
  "address",
  "city",
  "state",
  "postalCode",
  "companyProfile",
  "productCategoryRaw",
  "remarks",
  "productInterest",
] as const;

/**
 * One address often appears in five spreadsheets, each knowing
 * something the others don't (one has the country, another the phone,
 * a third the product). Keeps the fullest record as the base and fills
 * every gap in it from the others, takes the country from whichever
 * occurrence had the strongest evidence, and lists every file/sheet the
 * address was found in.
 */
export function mergeOccurrences(occurrences: NormalizedLead[]): NormalizedLead {
  const sorted = [...occurrences].sort((a, b) => richness(b) - richness(a));
  const base: NormalizedLead = { ...sorted[0], rawData: sorted[0].rawData ? { ...sorted[0].rawData } : null };
  // Whatever record is fullest, the merged one keeps the address the group is about
  // (a phone-only entry can be fuller than the email row it is being merged into).
  base.email = sorted.find((l) => l.email)?.email ?? null;

  for (const other of sorted.slice(1)) {
    for (const f of FILL_FIELDS) {
      if (!base[f] && other[f]) (base as unknown as Record<string, unknown>)[f] = other[f];
    }
    if (base.companyName.startsWith("Unknown") && !other.companyName.startsWith("Unknown")) {
      base.companyName = other.companyName;
    }
  }

  let bestStrength = COUNTRY_STRENGTH[base.countrySource ?? ""] ?? (base.country ? 5 : 0);
  for (const other of sorted.slice(1)) {
    const strength = COUNTRY_STRENGTH[other.countrySource ?? ""] ?? (other.country ? 5 : 0);
    if (other.country && strength > bestStrength) {
      base.country = other.country;
      base.countrySource = other.countrySource ?? null;
      bestStrength = strength;
    }
  }

  const where = (l: NormalizedLead) =>
    l.rawData?.__file ? `${l.rawData.__file} / ${l.rawData.__sheet} / row ${l.rawData.__row}` : l.source;
  // Every number seen for this contact in any file, however it was written.
  const phoneSeen = new Map<string, string>();
  for (const l of sorted) {
    for (const ph of [...(l.phones ?? []), l.phone, l.mobile]) {
      if (ph && ph.replace(/\D/g, "").length >= 7 && !phoneSeen.has(phoneKey(ph))) phoneSeen.set(phoneKey(ph), ph);
    }
  }
  base.phones = [...phoneSeen.values()];
  if (!base.phone && base.phones[0]) base.phone = base.phones[0];

  base.sourceFiles = [...new Set(sorted.map(where))];
  if (base.rawData && sorted.length > 1) {
    base.rawData.__also_in = base.sourceFiles.slice(0, 15).join(" ; ");
  }
  return finalizeCountry(base);
}

/** Country evidence from the lines around an email in a Word/PDF/slide file. */
export function countryFromContext(context: string, phone: string | null): { country: string; source: string } | null {
  const byText = countryFromText(context);
  if (byText) return { country: byText, source: "address-text" };
  if (looksIndian(context)) return { country: "India", source: "indian-address" };
  const byPhone = countryFromPhone(phone);
  if (byPhone) return { country: byPhone, source: "phone-code" };
  return null;
}

// ── Phone numbers ────────────────────────────────────────────

const PHONE_CANDIDATE = /(?<![\w@.])(?:\+|00)?\(?\d[\d\s().\-]{5,}\d(?![\w@])/g;
const PHONE_CUE = /(?:tel(?:ephone)?|phone|\bph|mob(?:ile)?|cell|whats?app|call|contact|direct|landline|\bll)\b[^\d+]{0,6}$/i;
const FAX_CUE = /fax[^\d+]{0,6}$/i;

/** Last ten digits — how the same number written three different ways is recognised as one. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/**
 * Every phone number in a piece of text, in the format it was written.
 *
 * `trusted` is for a cell whose column is a phone column: any run of 8–15
 * digits there is a phone. Anywhere else (an address, a remark, a Word
 * paragraph) a digit run is far more often a postal code, licence number,
 * HS code or date, so it only counts with evidence: a leading + or 00, a
 * "Tel:/Mob:" label just before it, or the shape of an Indian mobile.
 * Numbers labelled fax are skipped — they are not a line anyone answers.
 */
export function extractPhones(text: unknown, opts: { trusted?: boolean } = {}): string[] {
  if (text === null || text === undefined) return [];
  const s = String(text);
  const out: string[] = [];
  const seen = new Set<string>();
  let lastEnd = -1;

  for (const m of s.matchAll(PHONE_CANDIDATE)) {
    const raw = m[0].trim().replace(/[\s.\-(]+$/, "");
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) continue;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw) || /^\d+\.\d+$/.test(raw)) continue;

    const before = s.slice(Math.max(0, (m.index ?? 0) - 16), m.index ?? 0);
    if (FAX_CUE.test(before)) continue;

    const explicit = raw.startsWith("+") || raw.startsWith("00");
    const indianMobile = /^[6-9]\d{9}$/.test(digits);
    // "Tel: 86 427 5622927, 86 133 2427 1234" — the second number follows the first with only a separator between.
    const continuation = lastEnd >= 0 && /^[\s,;/&]{1,4}$/.test(s.slice(lastEnd, m.index ?? 0));
    if (!opts.trusted && !explicit && !indianMobile && !continuation && !PHONE_CUE.test(before)) continue;
    lastEnd = (m.index ?? 0) + m[0].length;

    const key = phoneKey(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }

  // A phone column holding something the pattern can't split
  // ("91-97110-3961591-80535-30523") is still kept, as written.
  // A spreadsheet number mangled into "2,356,103,023,562,480" is not a phone.
  const mangled = /^d{1,3}(?:,d{3}){2,}$/.test(s.trim());
  if (opts.trusted && out.length === 0 && !mangled) {
    const digits = s.replace(/\D/g, "");
    if (digits.length >= 7 && !/[a-z]{4,}/i.test(s)) out.push(s.trim().slice(0, 60));
  }
  return out;
}
