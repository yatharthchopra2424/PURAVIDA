// ─── Animation Constants ─────────────────────────────────────

export const EASE = {
  smooth: "power2.out",
  bounce: "elastic.out(1, 0.5)",
  snappy: "power3.out",
  gentle: "power1.inOut",
} as const;

export const DURATION = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  hero: 1.2,
  stagger: 0.08,
} as const;

// ─── Breakpoints (match Tailwind) ────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ─── Hero Slide Interval ─────────────────────────────────────

export const HERO_SLIDE_INTERVAL = 5000;

// ─── Product image fallback ──────────────────────────────────
// Shared between catalog.ts (server, resolves DB rows) and any client
// component that needs to tell "real photo" from "no image yet" apart.
export const PRODUCT_FALLBACK_IMAGE = "/images/Product%20Card%20Backgrounds.png";

// ─── Company Info ────────────────────────────────────────────

export const COMPANY = {
  name: "PuraVida Natural",
  // Was "Ayurvedic Heritage. Modern Science." — a third, different
  // tagline from the one on the actual logo artwork and hero copy
  // ("Cured by Nature. Perfected by Science."). This feeds
  // structured-data.ts's `slogan` field, so the mismatch was reaching
  // Google too, not just visitors.
  tagline: "Cured by Nature. Perfected by Science.",
  phone: "+91-9811647596",
  // The single company address, on the live domain. It was previously
  // split across two others — rk@puravida.org.in and
  // sales@puravidanatural.com — neither of which matches the site
  // (www.puravidanaturalindia.com). That mismatch reached the footer,
  // the contact page and the Organization structured data, so Google
  // and every visitor were given a contact on a domain the site does
  // not own. It is also the mailbox outbound email authenticates as,
  // and a From: domain that disagrees with the site's is a spam signal.
  email: "rk@puravidanaturalindia.com",
  // Kept as a distinct field so a real sales@ alias can be split out
  // later without touching every call site; same mailbox for now.
  salesEmail: "rk@puravidanaturalindia.com",
  address: "169, Uttam Nagar West, New Delhi - 110059, India",

  // ── Email signature ────────────────────────────────────────
  // Transcribed from the signature already used in Outlook, so mail the
  // app sends matches mail sent by hand. `name` stays the short brand
  // used across the site; `legalName` is what belongs at the bottom of
  // business correspondence.
  legalName: "Pura Vida Natural LLP",
  signerName: "R. Kumar",
  website: "https://www.puravidanaturalindia.com/",
  /** Every mailbox that reaches the team, listed in the sign-off. */
  contactEmails: [
    "rk@puravidanaturalindia.com",
    "ps@puravidanaturalindia.com",
    "exports@puravidanaturalindia.com",
  ],
  featuredProduct: {
    pitch: "Try our Advanced Digestive Fibre Blend.",
    url: "https://amzn.in/d/09imCeph",
  },
  // Verified against the GST REG-06 certificate (private-docs/legal/GST.pdf).
  gst: "07ABCFP5743N1ZS",
  fssaiLicense: "13325011000309",
  udyam: "UDYAM-DL-11-0042579",
  constitution: "Limited Liability Partnership",
  // iec: add the real Import-Export Code here when available.
  /**
   * Team experience in botanical ingredients (per the owners, Sep 2026).
   * The current legal entity, Pura Vida Natural LLP, was registered on
   * 26 Sep 2022 (Udyam certificate), so "founded" dates use that and
   * "experience" uses this; the two are never mixed.
   */
  experienceYears: 14,
  llpRegistered: "2022-09-26",
  hours: "Mon - Sat: 9:00 AM - 6:00 PM IST",
} as const;
