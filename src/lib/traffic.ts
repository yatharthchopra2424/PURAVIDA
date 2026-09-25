/**
 * Where a visit came from, in the buckets the Traffic page reports on.
 * AI assistants are split out on purpose: they are how GEO work shows up.
 */
export const TRAFFIC_SOURCES = [
  "google",
  "bing",
  "chatgpt",
  "perplexity",
  "gemini",
  "copilot",
  "claude",
  "other-ai",
  "linkedin",
  "facebook",
  "instagram",
  "youtube",
  "amazon",
  "indiamart",
  "email",
  "whatsapp",
  "direct",
  "other",
] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const AI_SOURCES: TrafficSource[] = ["chatgpt", "perplexity", "gemini", "copilot", "claude", "other-ai"];

const RULES: [RegExp, TrafficSource][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "chatgpt"],
  [/perplexity\.ai$/, "perplexity"],
  [/gemini\.google\.com$|bard\.google\.com$/, "gemini"],
  [/copilot\.microsoft\.com$|edgeservices\.bing\.com$/, "copilot"],
  [/claude\.ai$/, "claude"],
  [/you\.com$|phind\.com$|deepseek\.com$|meta\.ai$|grok\.com$|poe\.com$/, "other-ai"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$|duckduckgo\.com$|yahoo\.com$|ecosia\.org$/, "bing"],
  [/linkedin\.com$|lnkd\.in$/, "linkedin"],
  [/facebook\.com$|fb\.com$|m\.facebook\.com$/, "facebook"],
  [/instagram\.com$/, "instagram"],
  [/youtube\.com$|youtu\.be$/, "youtube"],
  [/amazon\.[a-z.]+$|amzn\.[a-z]+$/, "amazon"],
  [/indiamart\.com$|tradeindia\.com$|exportersindia\.com$/, "indiamart"],
  [/mail\.|outlook\.|webmail/, "email"],
  [/whatsapp\.com$|wa\.me$/, "whatsapp"],
];

export function classifySource(referrerHost: string | null, utmSource: string | null, utmMedium: string | null): TrafficSource {
  const u = (utmSource ?? "").toLowerCase();
  if (u) {
    if (/chatgpt|openai/.test(u)) return "chatgpt";
    if (/perplexity/.test(u)) return "perplexity";
    if (/gemini/.test(u)) return "gemini";
    if (/copilot/.test(u)) return "copilot";
    if (/claude/.test(u)) return "claude";
    if (/amazon/.test(u)) return "amazon";
    if (/linkedin/.test(u)) return "linkedin";
    if (/whatsapp/.test(u)) return "whatsapp";
    if (/newsletter|campaign|mail/.test(u) || (utmMedium ?? "").toLowerCase() === "email") return "email";
    if (/google/.test(u)) return "google";
    if (/bing/.test(u)) return "bing";
  }
  if (!referrerHost) return "direct";
  for (const [re, source] of RULES) if (re.test(referrerHost)) return source;
  return "other";
}
