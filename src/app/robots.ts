import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * AI assistants and answer engines are named and explicitly allowed:
 * being quoted by ChatGPT / Perplexity / Gemini / Copilot / Claude is how
 * buyers increasingly find suppliers (see docs/plans/03-SEO-GEO-AEO-PLAN.md).
 * The admin panel and API stay out of every crawl.
 */
const PRIVATE = ["/x-admin", "/x-admin/", "/api/"];
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
  "Meta-ExternalAgent",
  "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
