/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Supabase host, for CSP connect-src / img-src and next/image.
// Falls back to the production project if the env var is absent at
// config-evaluation time (e.g. `next lint` without an env file).
const supabaseHost = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "https://trvdpeikaknjkcnpeoea.supabase.co"
    ).hostname;
  } catch {
    return "trvdpeikaknjkcnpeoea.supabase.co";
  }
})();

/**
 * Content Security Policy.
 *
 * 'unsafe-inline' on script-src is required by Next.js's inline
 * bootstrap. The stricter alternative is a per-request nonce generated
 * in middleware — but that forces every page to render dynamically,
 * which would undo the static rendering work in P1-1. For a public
 * marketing and catalog site with no user-generated HTML, the static
 * policy below is the right trade-off. Revisit if user content is ever
 * rendered.
 *
 * style-src needs 'unsafe-inline' for framer-motion / GSAP inline
 * styles and for the critical CSS that experimental.optimizeCss inlines.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: https://${supabaseHost}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}${isDev ? " ws://localhost:*" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // 2 years, matching the HSTS preload requirement.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant with frame-ancestors above, but still honoured by older
  // browsers that ignore CSP level 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 60s was needlessly short — these assets are content-addressed and
    // change rarely, so re-optimising hourly wasted Vercel image quota.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // SVGs are not used as remote images; keep the optimiser locked down.
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
  },

  compiler: {
    removeConsole: isDev ? false : { exclude: ["error", "warn"] },
  },

  experimental: {
    optimizeCss: true,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // NOTE: no custom Cache-Control for /_next/static — Next already
      // serves that immutably, and overriding it triggers a build
      // warning ("can break Next.js development behavior") in v16.
      {
        // The admin panel must never be cached by a CDN or a shared
        // proxy: responses are user-specific.
        source: "/x-admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
