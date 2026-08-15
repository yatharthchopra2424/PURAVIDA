/**
 * Canonical site origin — single source of truth.
 *
 * Previously sitemap.ts and robots.ts each hardcoded
 * "https://puravidanatural.com", which is NOT the live domain
 * (www.puravidanaturalindia.com). Every URL submitted to Google
 * pointed at a different site.
 *
 * Set NEXT_PUBLIC_SITE_URL per environment:
 *   local      → http://localhost:3000
 *   preview    → the Vercel preview URL
 *   production → https://www.puravidanaturalindia.com
 */
const FALLBACK_SITE_URL = "https://www.puravidanaturalindia.com";

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (raw) {
    // Tolerate a trailing slash in the env var; URLs are joined manually.
    return raw.replace(/\/+$/, "");
  }

  // Vercel injects this for preview deployments, where a hardcoded
  // production domain would produce wrong canonical URLs.
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  return FALLBACK_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();

/** Absolute URL for a site-relative path. `absoluteUrl("/about")`. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
