import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { classifySource } from "@/lib/traffic";

export const dynamic = "force-dynamic";

const EventSchema = z.object({
  event: z.enum(["pageview", "add_to_quote", "quote_open", "form_start", "form_submit", "amazon_click", "whatsapp_click"]),
  path: z.string().max(300).regex(/^\//),
  sid: z.string().max(40).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  utm: z
    .object({
      source: z.string().max(120).nullable().optional(),
      medium: z.string().max(120).nullable().optional(),
      campaign: z.string().max(120).nullable().optional(),
    })
    .optional()
    .nullable(),
  w: z.number().int().min(0).max(10000).optional(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|curl|wget|python|axios/i;

/**
 * Anonymous event collector for the admin Traffic page. Always answers
 * 204 so a failure here is invisible to visitors; bots are dropped.
 */
export async function POST(req: NextRequest) {
  const ok = new NextResponse(null, { status: 204 });
  try {
    if (BOT.test(req.headers.get("user-agent") ?? "")) return ok;
    // Only accept beacons from our own pages.
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) return ok;

    const text = await req.text();
    if (text.length > 4000) return ok;
    const parsed = EventSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return ok;
    const e = parsed.data;

    let referrerHost: string | null = null;
    try {
      referrerHost = e.referrer ? new URL(e.referrer).hostname.replace(/^www\./, "") : null;
    } catch {
      referrerHost = null;
    }
    const productSlug = /^\/products\/[^/]+\/([^/]+)/.exec(e.path)?.[1] ?? null;
    const device = !e.w ? null : e.w < 768 ? "mobile" : e.w < 1024 ? "tablet" : "desktop";

    const metaJson = e.meta ? JSON.stringify(e.meta) : null;
    await createSupabaseServiceClient()
      .from("site_events")
      .insert({
        event: e.event,
        path: e.path,
        session_id: e.sid ?? null,
        referrer_host: referrerHost,
        source: classifySource(referrerHost, e.utm?.source ?? null, e.utm?.medium ?? null),
        utm_source: e.utm?.source ?? null,
        utm_medium: e.utm?.medium ?? null,
        utm_campaign: e.utm?.campaign ?? null,
        country: req.headers.get("x-vercel-ip-country"),
        device,
        product_slug: productSlug,
        meta: metaJson && metaJson.length <= 1000 ? e.meta : null,
      });
  } catch {
    /* never surface analytics errors */
  }
  return ok;
}
