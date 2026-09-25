/**
 * First-party, cookie-free analytics (browser side).
 *
 * Events go to /api/t/e and land in `site_events`, which the admin Traffic
 * page reads. No cookies and nothing that identifies a person: the only
 * id is a random value in sessionStorage that dies with the tab, so no
 * consent banner is needed.
 */

export type TrackEvent =
  | "pageview"
  | "add_to_quote"
  | "quote_open"
  | "form_start"
  | "form_submit"
  | "amazon_click"
  | "whatsapp_click";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("pv_sid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("pv_sid", id);
    }
    return id;
  } catch {
    return "nosession";
  }
}

/** First-touch attribution for this tab: kept so a quote submitted three pages later is still credited to the ad or search that brought the visitor. */
export function attribution(): { referrer: string | null; utm: { source: string | null; medium: string | null; campaign: string | null } } {
  try {
    const saved = sessionStorage.getItem("pv_attr");
    if (saved) return JSON.parse(saved);
    const params = new URLSearchParams(window.location.search);
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : null;
    const value = {
      referrer: ref,
      utm: { source: params.get("utm_source"), medium: params.get("utm_medium"), campaign: params.get("utm_campaign") },
    };
    sessionStorage.setItem("pv_attr", JSON.stringify(value));
    return value;
  } catch {
    return { referrer: null, utm: { source: null, medium: null, campaign: null } };
  }
}

export function track(event: TrackEvent, meta?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  // Admin pages and local dev never pollute the numbers.
  if (window.location.pathname.startsWith("/x-admin")) return;
  if (/^(localhost|127\.)/.test(window.location.hostname)) return;
  try {
    const a = attribution();
    const body = JSON.stringify({
      event,
      path: window.location.pathname,
      sid: sessionId(),
      referrer: a.referrer,
      utm: a.utm,
      w: window.innerWidth,
      meta: meta ?? null,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/t/e", blob)) {
      void fetch("/api/t/e", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    /* analytics must never break the page */
  }
}
