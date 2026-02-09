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

// ─── Company Info ────────────────────────────────────────────

export const COMPANY = {
  name: "PuraVida Natural",
  tagline: "Ayurvedic Heritage. Modern Science.",
  phone: "+91-9811647596",
  email: "rk@puravida.org.in",
  salesEmail: "sales@puravidanatural.com",
  address: "169, Uttam Nagar West, New Delhi - 110059, India",
  gst: "07ABCFP5743NIZS",
  iec: "0500XXXXXX",
  established: "2000",
  hours: "Mon - Sat: 9:00 AM - 6:00 PM IST",
} as const;
