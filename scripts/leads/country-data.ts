/**
 * country-data.ts — turns messy location evidence into one canonical
 * country, and says how it knew.
 *
 * The raw sheets say where a company is in a dozen different ways: a
 * "Country" column ("Itly", "USA", "U.S.A"), a "Region" column, the end
 * of an address ("… Krefeld, Germany"), an Indian state or city with no
 * country at all ("GHAZIABAD, U.P. 201010"), a phone number with a
 * country code, or just the email's domain suffix. Each of those is a
 * different strength of evidence, so callers combine them in that order
 * and record which one won (`country_source`) instead of pretending
 * every value is equally certain.
 */

// [canonical, ISO-2, calling code, aliases…]. Aliases are lower-case.
type Row = [string, string, string, ...string[]];

const COUNTRIES: Row[] = [
  ["India", "in", "91", "bharat", "republic of india", "ind"],
  ["United States", "us", "1", "usa", "u.s.a", "u.s.a.", "u.s.", "united states of america", "america", "us of a"],
  ["United Kingdom", "gb", "44", "uk", "u.k.", "great britain", "britain", "england", "scotland", "wales", "northern ireland"],
  ["Canada", "ca", "1"],
  ["Australia", "au", "61"],
  ["New Zealand", "nz", "64", "nz"],
  ["Germany", "de", "49", "deutschland", "germany."],
  ["France", "fr", "33", "franc"],
  ["Italy", "it", "39", "itly", "italia"],
  ["Spain", "es", "34", "españa", "espana"],
  ["Portugal", "pt", "351"],
  ["Netherlands", "nl", "31", "the netherlands", "holland"],
  ["Belgium", "be", "32"],
  ["Switzerland", "ch", "41"],
  ["Austria", "at", "43"],
  ["Sweden", "se", "46"],
  ["Norway", "no", "47"],
  ["Denmark", "dk", "45"],
  ["Finland", "fi", "358"],
  ["Ireland", "ie", "353", "republic of ireland", "eire"],
  ["Poland", "pl", "48"],
  ["Czech Republic", "cz", "420", "czechia", "czech"],
  ["Slovakia", "sk", "421"],
  ["Hungary", "hu", "36"],
  ["Romania", "ro", "40"],
  ["Bulgaria", "bg", "359"],
  ["Greece", "gr", "30"],
  ["Croatia", "hr", "385"],
  ["Serbia", "rs", "381"],
  ["Slovenia", "si", "386"],
  ["Estonia", "ee", "372"],
  ["Latvia", "lv", "371"],
  ["Lithuania", "lt", "370"],
  ["Ukraine", "ua", "380"],
  ["Belarus", "by", "375"],
  ["Russia", "ru", "7", "russian federation"],
  ["Turkey", "tr", "90", "türkiye", "turkiye"],
  ["Israel", "il", "972"],
  ["Iran", "ir", "98"],
  ["Iraq", "iq", "964"],
  ["Saudi Arabia", "sa", "966", "ksa", "kingdom of saudi arabia"],
  ["United Arab Emirates", "ae", "971", "uae", "u.a.e", "u.a.e.", "dubai", "abu dhabi", "sharjah"],
  ["Qatar", "qa", "974"],
  ["Kuwait", "kw", "965"],
  ["Bahrain", "bh", "973"],
  ["Oman", "om", "968"],
  ["Jordan", "jo", "962"],
  ["Lebanon", "lb", "961"],
  ["Syria", "sy", "963"],
  ["Yemen", "ye", "967"],
  ["Egypt", "eg", "20"],
  ["Morocco", "ma", "212"],
  ["Algeria", "dz", "213"],
  ["Tunisia", "tn", "216"],
  ["Libya", "ly", "218"],
  ["Sudan", "sd", "249"],
  ["Ethiopia", "et", "251"],
  ["Kenya", "ke", "254"],
  ["Uganda", "ug", "256"],
  ["Tanzania", "tz", "255"],
  ["Rwanda", "rw", "250"],
  ["Nigeria", "ng", "234"],
  ["Ghana", "gh", "233"],
  ["Senegal", "sn", "221"],
  ["Ivory Coast", "ci", "225", "cote d'ivoire", "côte d'ivoire"],
  ["Cameroon", "cm", "237"],
  ["Benin", "bj", "229"],
  ["Togo", "tg", "228"],
  ["Mali", "ml", "223"],
  ["Angola", "ao", "244"],
  ["Mozambique", "mz", "258"],
  ["Zambia", "zm", "260"],
  ["Zimbabwe", "zw", "263"],
  ["Botswana", "bw", "267"],
  ["Namibia", "na", "264"],
  ["South Africa", "za", "27", "s. africa", "s.africa"],
  ["Madagascar", "mg", "261"],
  ["Mauritius", "mu", "230"],
  ["China", "cn", "86", "prc", "people's republic of china", "peoples republic of china", "p.r. china", "p.r.c"],
  ["Hong Kong", "hk", "852", "hongkong"],
  ["Taiwan", "tw", "886", "r.o.c", "republic of china"],
  ["Japan", "jp", "81"],
  ["South Korea", "kr", "82", "korea", "republic of korea", "rok", "s. korea", "s.korea"],
  ["North Korea", "kp", "850"],
  ["Mongolia", "mn", "976"],
  ["Singapore", "sg", "65"],
  ["Malaysia", "my", "60"],
  ["Indonesia", "id", "62"],
  ["Thailand", "th", "66"],
  ["Vietnam", "vn", "84", "viet nam"],
  ["Philippines", "ph", "63", "the philippines"],
  ["Cambodia", "kh", "855"],
  ["Laos", "la", "856"],
  ["Myanmar", "mm", "95", "burma"],
  ["Bangladesh", "bd", "880"],
  ["Sri Lanka", "lk", "94", "srilanka"],
  ["Nepal", "np", "977"],
  ["Bhutan", "bt", "975"],
  ["Pakistan", "pk", "92"],
  ["Afghanistan", "af", "93"],
  ["Maldives", "mv", "960"],
  ["Kazakhstan", "kz", "7"],
  ["Uzbekistan", "uz", "998"],
  ["Georgia", "ge", "995"],
  ["Armenia", "am", "374"],
  ["Azerbaijan", "az", "994"],
  ["Mexico", "mx", "52"],
  ["Brazil", "br", "55", "brasil"],
  ["Argentina", "ar", "54"],
  ["Chile", "cl", "56"],
  ["Peru", "pe", "51"],
  ["Colombia", "co", "57"],
  ["Venezuela", "ve", "58"],
  ["Ecuador", "ec", "593"],
  ["Bolivia", "bo", "591"],
  ["Paraguay", "py", "595"],
  ["Uruguay", "uy", "598"],
  ["Costa Rica", "cr", "506"],
  ["Panama", "pa", "507"],
  ["Guatemala", "gt", "502"],
  ["Dominican Republic", "do", "1"],
  ["Cuba", "cu", "53"],
  ["Jamaica", "jm", "1"],
  ["Cyprus", "cy", "357"],
  ["Malta", "mt", "356"],
  ["Iceland", "is", "354"],
  ["Luxembourg", "lu", "352"],
  ["Albania", "al", "355"],
  ["Bosnia and Herzegovina", "ba", "387", "bosnia"],
  ["North Macedonia", "mk", "389", "macedonia"],
  ["Moldova", "md", "373"],
  ["Fiji", "fj", "679"],
  ["Papua New Guinea", "pg", "675"],
];

/** Words that are also common ordinary words or names: honoured only when they are the whole cell. */
const CELL_ONLY = new Set(["georgia", "jordan", "mali", "chad", "turkey", "niger", "ind", "wales"]);

const TLD_TO_COUNTRY = new Map<string, string>();
const CALLING = new Map<string, string>();
const ALIAS = new Map<string, string>();
for (const [name, iso, calling, ...aliases] of COUNTRIES) {
  if (!TLD_TO_COUNTRY.has(iso)) TLD_TO_COUNTRY.set(iso, name);
  if (!CALLING.has(calling) || name === "United States" || name === "Russia") CALLING.set(calling, CALLING.get(calling) ?? name);
  ALIAS.set(name.toLowerCase(), name);
  for (const a of aliases) ALIAS.set(a, name);
}
// `.uk` is the real suffix for the United Kingdom; ISO is "gb".
TLD_TO_COUNTRY.set("uk", "United Kingdom");
TLD_TO_COUNTRY.set("su", "Russia");
CALLING.set("1", "United States");
CALLING.set("7", "Russia");

// ── India, in enough detail to recognise an Indian address without the word "India" ──

const INDIAN_STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "chattisgarh", "goa", "gujarat",
  "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "kerla", "madhya pradesh", "maharashtra",
  "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "orissa", "punjab", "rajasthan", "sikkim",
  "tamil nadu", "tamilnadu", "telangana", "tripura", "uttar pradesh", "uttarakhand", "uttaranchal",
  "west bengal", "delhi", "new delhi", "chandigarh", "puducherry", "pondicherry", "jammu", "kashmir",
  "ladakh", "daman", "diu", "dadra", "lakshadweep", "andaman",
];
const INDIAN_STATE_ABBR = ["u.p.", "m.p.", "a.p.", "h.p.", "t.n.", "w.b."];
const INDIAN_CITIES = [
  "mumbai", "bombay", "pune", "nagpur", "nashik", "thane", "navi mumbai", "aurangabad", "kolhapur", "solapur",
  "ahmedabad", "surat", "vadodara", "baroda", "rajkot", "gandhinagar", "bhavnagar", "jamnagar", "morbi",
  "bangalore", "bengaluru", "mysore", "mysuru", "hubli", "mangalore", "belgaum", "chennai", "madras", "coimbatore",
  "madurai", "tiruchirappalli", "trichy", "erode", "tirunelveli", "hyderabad", "secunderabad", "vijayawada",
  "visakhapatnam", "vizag", "guntur", "tirupati", "kochi", "cochin", "ernakulam", "thiruvananthapuram", "trivandrum",
  "kozhikode", "calicut", "thrissur", "kottayam", "alappuzha", "kolkata", "calcutta", "howrah", "kanpur", "lucknow",
  "agra", "varanasi", "meerut", "ghaziabad", "noida", "greater noida", "faridabad", "gurgaon", "gurugram", "sonipat",
  "panipat", "ambala", "karnal", "rohtak", "hisar", "jaipur", "jodhpur", "udaipur", "kota", "ajmer", "bikaner",
  "alwar", "indore", "bhopal", "gwalior", "jabalpur", "ujjain", "ludhiana", "amritsar", "jalandhar", "patiala",
  "mohali", "panchkula", "dehradun", "haridwar", "roorkee", "rudrapur", "patna", "ranchi", "jamshedpur", "bhubaneswar",
  "cuttack", "raipur", "bhilai", "guwahati", "shillong", "solan", "baddi", "paonta sahib", "kala amb", "silvassa", "vapi",
  "valsad", "ankleshwar", "bharuch", "daman", "sahibabad", "sahibad", "bahadurgarh", "manesar", "kundli", "bawal",
];

const ind = (list: string[]) => new RegExp("(^|[^a-z])(" + list.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")([^a-z]|$)", "i");
const INDIAN_STATE_RE = ind(INDIAN_STATES);
const INDIAN_CITY_RE = ind(INDIAN_CITIES);
const INDIAN_ABBR_RE = ind(INDIAN_STATE_ABBR);
const GST_RE = /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/;

// ── Matching ─────────────────────────────────────────────────

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** A value that is meant to BE a country ("USA", "Itly", "INDIA."). Returns the canonical name or null. */
export function countryFromCell(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = normalise(String(value)).replace(/[.,;:()"'`]+$/g, "").replace(/^[("'`]+/, "");
  if (!s || /^(na|n\/a|nil|none|null|-|—|unknown)$/.test(s)) return null;

  if (ALIAS.has(s)) return ALIAS.get(s)!;
  // "Germany / Austria", "USA - Florida": take the first part that is a country.
  for (const part of s.split(/\s*[\/;|&]\s*|\s+-\s+/)) {
    if (part !== s && ALIAS.has(part.trim())) return ALIAS.get(part.trim())!;
  }
  const fromText = countryFromText(s);
  if (fromText) return fromText;

  // Typos: "Itly", "Germny". Single short word, edit distance 1 (2 for long names).
  if (/^[a-z .'-]{4,25}$/.test(s)) {
    let best: { name: string; d: number } | null = null;
    for (const [alias, name] of ALIAS) {
      if (alias.length < 4) continue;
      const limit = alias.length >= 8 ? 2 : 1;
      const d = editDistance(s, alias);
      if (d <= limit && (!best || d < best.d)) best = { name, d };
    }
    if (best) return best.name;
  }
  return null;
}

/**
 * The country named in free text (an address). Picks the LAST one,
 * because an address ends with its country ("…, Krefeld, Germany"), and
 * ignores short/common words that only count when they are a whole cell.
 */
// Compiled once: this runs for every address cell of ~50k rows.
const TEXT_MATCHERS = [...ALIAS]
  .filter(([alias]) => alias.length >= 3 && !CELL_ONLY.has(alias))
  .map(([alias, name]) => ({
    alias,
    name,
    re: new RegExp("(?<![a-z])" + alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z])", "g"),
  }));

export function countryFromText(text: unknown): string | null {
  if (text === null || text === undefined) return null;
  const s = " " + normalise(String(text)).replace(/[,;()|/]+/g, " , ") + " ";
  const hits: { start: number; end: number; name: string }[] = [];
  for (const { alias, name, re } of TEXT_MATCHERS) {
    for (const m of s.matchAll(re)) hits.push({ start: m.index!, end: m.index! + alias.length, name });
  }
  if (hits.length === 0) return null;
  // Drop matches wholly inside a longer one ("guinea" inside "papua new guinea").
  const kept = hits.filter((h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start));
  kept.sort((a, b) => a.start - b.start);
  return kept[kept.length - 1].name;
}

/** Text that is recognisably an Indian address even without the word "India". */
export function looksIndian(text: unknown): boolean {
  if (text === null || text === undefined) return false;
  const s = String(text);
  return GST_RE.test(s) || INDIAN_STATE_RE.test(s) || INDIAN_CITY_RE.test(s) || INDIAN_ABBR_RE.test(s);
}

/** Country from an INTERNATIONAL-format phone number only ("+49 …", "0086 …", "91-20-…"). */
export function countryFromPhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const first = String(raw).split(/[,/;]|\bto\b/i)[0].trim();
  let digits = first.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  const explicit = first.startsWith("+") || first.startsWith("00");
  const indiaStyle = /^91[\s.-]/.test(first) && digits.length >= 11;
  if (!explicit && !indiaStyle) return null;
  if (first.startsWith("00")) digits = digits.slice(2);
  for (const len of [3, 2, 1]) {
    const name = CALLING.get(digits.slice(0, len));
    if (name) return name;
  }
  return null;
}

/** A bare 10-digit number with no punctuation, starting 6-9: almost always an Indian mobile. Weak evidence. */
export function looksLikeIndianMobile(raw: unknown): boolean {
  // "9450938785, 8953504950": judge by the first number listed.
  return /^[6-9]\d{9}$/.test(String(raw ?? "").split(/[,/;]/)[0].trim());
}

/** Country from a domain's suffix; `.com`/`.net`/… say nothing and return null. */
export function countryFromDomain(address: unknown): string | null {
  if (!address) return null;
  const s = String(address).trim().toLowerCase();
  const host = s.includes("@") ? s.split("@").pop()! : s.replace(/^https?:\/\//, "").split("/")[0];
  const tld = host.split(".").pop() ?? "";
  if (tld.length !== 2) return null;
  if (["io", "co", "tv", "me", "ai", "cc", "ly", "fm", "to", "ws", "gg", "vc", "sh", "ac", "im", "nu", "ag", "ms", "tk", "ml", "ga", "cf", "gq", "cx", "pw", "so", "gl", "bz", "dj"].includes(tld)) return null;
  return TLD_TO_COUNTRY.get(tld) ?? null;
}

export type CountrySource =
  | "country-column"
  | "address-text"
  | "indian-address"
  | "phone-code"
  | "sheet-majority"
  | "email-domain"
  | "website-domain"
  | "company-name"
  | "phone-10-digit"
  | "source";

/** True when the text contains an Indian GST number — unmistakably an Indian business. */
export function hasGstin(text: unknown): boolean {
  return GST_RE.test(String(text ?? ""));
}

// Legal-form suffixes that only exist in one country (or overwhelmingly one).
const COMPANY_SUFFIXES: [RegExp, string][] = [
  [/\bsdn\.?\s*bhd\b/i, "Malaysia"],
  [/\bpte\.?\s*ltd\b/i, "Singapore"],
  [/\bpty\.?\s*ltd\b/i, "Australia"],
  [/\bgmbh\b/i, "Germany"],
  [/\bs\.?r\.?l\.?\b(?!\s*o)/i, "Italy"],
  [/\bs\.p\.a\b/i, "Italy"],
  [/\bsarl\b/i, "France"],
  [/\bb\.v\.?(?=\s|$|,)/i, "Netherlands"],
  [/\bltda\b/i, "Brazil"],
  [/\bs\.?a\.?\s+de\s+c\.?v\.?/i, "Mexico"],
  [/\bsp\.?\s*z\s*o\.?\s*o\.?\b/i, "Poland"],
  [/\booo\b/i, "Russia"],
  [/\bpvt\.?\s*\.?\s*ltd\b|\bprivate\s+limited\b|\bpvt\b/i, "India"],
];

/** Country implied by a company's own name: a legal form ("SDN BHD") or a country word ("Azelis Bulgaria EAD"). */
export function countryFromCompanyName(name: unknown): string | null {
  const s = String(name ?? "");
  if (!s || s.startsWith("Unknown")) return null;
  for (const [re, country] of COMPANY_SUFFIXES) if (re.test(s)) return country;
  return countryFromText(s);
}
