"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import {
  Globe2,
  Truck,
  FileCheck2,
  PackageCheck,
  ShieldCheck,
  BadgeCheck,
  FileSearch,
  Scale,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { Marquee } from "@/components/motion/Marquee";
import { BorderBeam } from "@/components/motion/BorderBeam";

/**
 * Home-page trust sections, added after the Aug–Sep 2026 analytics showed
 * 82 home-page views producing a single visit to the quote page and a 63%
 * bounce rate: visitors weren't given a reason to trust or a next step.
 *
 * Every claim here is backed by a document (see private-docs/legal) or by
 * the owners' own statement (years of experience, export supply).
 */

// ── Animated counter (in view, once, respects reduced motion) ──────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }),
};

// ── 1 · Proof bar ────────────────────────────────────────────────
export function ProofBar({ productCount }: { productCount: number }) {
  const items = [
    { value: <Counter to={COMPANY.experienceYears} suffix="+" />, label: "Years of experience" },
    { value: <Counter to={productCount} suffix="+" />, label: "Botanical ingredients" },
    { value: "India + Export", label: "Domestic & international supply" },
    { value: "1 day", label: "Quote reply time" },
  ];
  return (
    <section aria-label="PuraVida at a glance" className="relative z-10 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden border-y border-emerald-100 bg-emerald-100 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="bg-white px-4 py-7 text-center sm:px-6"
          >
            <p className="font-heading text-3xl font-black text-emerald-700 sm:text-4xl">{it.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">{it.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── 1b · Credentials ticker ────────────────────────────────────────
const TICKER = [
  "FSSAI licensed",
  "Halal India certified",
  "GST registered",
  "Udyam (MSME) registered",
  `${COMPANY.experienceYears}+ years of experience`,
  "India & export supply",
  "Certificate of analysis on request",
  "Made in India",
];

export function CredentialsTicker() {
  return (
    <div className="border-b border-emerald-100 bg-emerald-50/60 py-3.5" aria-label="Credentials">
      <Marquee duration={45}>
        {TICKER.map((t) => (
          <span key={t} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald" aria-hidden="true" /> {t}
          </span>
        ))}
      </Marquee>
    </div>
  );
}

// ── 2 · Export ───────────────────────────────────────────────────
const EXPORT_STEPS = [
  { icon: FileSearch, title: "Specification & quote", body: "Grade, standardisation, packing and price confirmed in writing before you commit." },
  { icon: FileCheck2, title: "Samples & COA", body: "Samples for your lab, with the certificate of analysis for the batch." },
  { icon: PackageCheck, title: "Export packing", body: "Food-grade, moisture-safe packing labelled for international shipment." },
  { icon: Truck, title: "Documents & dispatch", body: "Commercial invoice, packing list, COA and certificate of origin, plus Halal certificate where applicable." },
];

export function ExportSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 py-20 text-white lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-amber-400/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> Domestic &amp; export
          </span>
          <h2 className="mt-5 font-heading text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            From New Delhi to buyers across India and abroad
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-emerald-50/90">
            For {COMPANY.experienceYears}+ years we&apos;ve supplied herbal extracts, essential oils, oleoresins and nutraceutical
            ingredients to manufacturers, brands and traders in India, and exported them to buyers overseas. One team handles
            both, with the same specifications and documentation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact#quote"
              className="btn-shine group inline-flex h-[3.25rem] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-7 font-bold shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5"
            >
              Request an export quote
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <a
              href={`mailto:exports@puravidanaturalindia.com`}
              className="inline-flex h-[3.25rem] min-w-0 items-center justify-center truncate rounded-xl border border-white/30 px-6 font-semibold text-white transition-colors hover:bg-white/10"
            >
              exports@puravidanaturalindia.com
            </a>
          </div>
        </motion.div>

        <ol className="grid gap-4 sm:grid-cols-2">
          {EXPORT_STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              custom={i + 1}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="group rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-sm transition-colors hover:border-amber-300/40 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-amber-300 transition-transform group-hover:scale-110">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold text-emerald-200">STEP {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-emerald-50/80">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── 3 · Transparency ─────────────────────────────────────────────
const REGISTRATIONS = [
  { icon: Scale, label: "Legal entity", value: COMPANY.legalName, note: COMPANY.constitution, href: null },
  { icon: BadgeCheck, label: "GSTIN", value: COMPANY.gst, note: "Verify on the GST portal", href: "https://services.gst.gov.in/services/searchtp" },
  { icon: ShieldCheck, label: "FSSAI licence", value: COMPANY.fssaiLicense, note: "Verify on FoSCoS", href: "https://foscos.fssai.gov.in/" },
  { icon: BadgeCheck, label: "Halal certification", value: "HIW28020819", note: "Halal India, product list on request", href: null },
  { icon: FileCheck2, label: "Udyam (MSME)", value: COMPANY.udyam, note: "Verify on Udyam portal", href: "https://udyamregistration.gov.in/" },
  { icon: MapPin, label: "Registered office", value: COMPANY.address, note: "As on our GST registration", href: null },
];

const PROMISES = [
  "Every figure on our spec sheets is the one on the COA: no inflated standardisation.",
  "Prices quoted in writing with packing, Incoterms and validity spelled out.",
  "We tell you up front if we don't stock a grade, instead of substituting quietly.",
  "Our registrations are public: check any of them yourself, right here.",
];

export function TransparencySection() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div variants={fadeUp} custom={0} initial="hidden" whileInView="show" viewport={{ once: true }} className="max-w-3xl">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">Transparent by default</span>
          <h2 className="mt-3 font-heading text-3xl font-black tracking-tight text-emerald-700 sm:text-5xl">
            Nothing to take on trust. Verify us.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Buying botanicals from a new supplier is a risk. So we publish who we are, and link every registration to the
            government register where you can check it.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <dl className="grid gap-4 sm:grid-cols-2">
            {REGISTRATIONS.map((r, i) => (
              <motion.div
                key={r.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="group rounded-2xl border border-gray-100 bg-gray-50/60 p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/5"
              >
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <r.icon className="h-4 w-4 text-emerald" aria-hidden="true" /> {r.label}
                </dt>
                <dd className="mt-2 break-words font-mono text-[15px] font-semibold text-gray-900">{r.value}</dd>
                <dd className="mt-1 text-xs text-gray-500">
                  {r.href ? (
                    <a href={r.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline">
                      {r.note} →
                    </a>
                  ) : (
                    r.note
                  )}
                </dd>
              </motion.div>
            ))}
          </dl>

          <motion.div
            variants={fadeUp}
            custom={2}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white p-7 ring-1 ring-emerald-100"
          >
            <h3 className="text-lg font-bold text-gray-900">How we work with you</h3>
            <ul className="mt-5 space-y-4">
              {PROMISES.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-gray-700">
                  <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/facility" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
              Facility &amp; certification <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── 4 · Quote band ───────────────────────────────────────────────
export function QuoteBand({ productCount }: { productCount: number }) {
  return (
    <section className="bg-white pb-20 lg:pb-28">
      <motion.div
        variants={fadeUp}
        custom={0}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative mx-4 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-10 text-center text-white shadow-2xl shadow-orange-500/20 sm:mx-6 lg:mx-auto lg:max-w-6xl lg:p-14"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
        <BorderBeam />
        <h2 className="relative font-heading text-3xl font-black tracking-tight sm:text-4xl">Need pricing for your next batch?</h2>
        <p className="relative mx-auto mt-3 max-w-2xl text-lg text-white/90">
          Tell us the products and quantities. You&apos;ll get price, MOQ and specifications within one business day, for
          delivery in India or export.
        </p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/contact#quote"
            className="btn-shine inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-white px-8 font-bold text-orange-600 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Request a quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/products"
            className="inline-flex h-[3.25rem] items-center justify-center rounded-xl border-2 border-white/60 px-8 font-semibold text-white transition-colors hover:bg-white/10"
          >
            Browse {productCount}+ products
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
