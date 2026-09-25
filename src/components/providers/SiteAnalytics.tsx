"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics for the public site only. Admin pages were 58% of
 * all recorded page views (218 of 373, Aug 26 – Sep 25 2026), which made
 * visitor numbers, top pages and bounce rate describe the team, not buyers.
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => (new URL(event.url).pathname.startsWith("/x-admin") ? null : event)} />;
}
