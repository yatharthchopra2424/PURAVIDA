"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Leaf, FlaskConical, Globe2 } from "lucide-react";

/**
 * "Welcome to Pura Vida" — the brand story section, directly under the hero.
 *
 * The source copy runs to ~450 words, which is a wall of text if dropped in
 * as-is. It is split across three tabs so a visitor reads one idea at a time
 * and can choose what matters to them — the wording itself is unchanged.
 *
 * The portrait uses an asymmetric leaf frame (two opposite corners rounded)
 * rather than a circle: it reads as premium, and the silhouette echoes the
 * botanical subject.
 */

const TABS = [
  {
    id: "who-we-are",
    label: "Who We Are",
    icon: Leaf,
    paragraphs: [
      "Pura Vida established in India, the country of Ayurveda, is dedicated to manufacturing, commercialization and distribution of natural botanical extracts, Herb Powders, Essential Oils from all over the world. High-quality ingredient selection along with cooperative manufacturing presence in various Indian natural resource rich states is our core competency. Quality, responsibility, commitment, consistency and great service are among other values that set the standard of action to build long term business relationships. We'll do everything under the law of country, to satisfy our customer needs and building long term partnerships.",
    ],
  },
  {
    id: "philosophy",
    label: "Our Philosophy",
    icon: FlaskConical,
    paragraphs: [
      "Mankind has always turned back to Mother Earth for disease free pure & simple Life – Pura Vida. At Pura Vida, We believe in the Veda philosophy, which says that nature has always an abundance of plants, roots, flowers and herbs rich in vitamins, enzymes, proteins and minerals that have been used in body and skin-care in Indian system of medicine Ayurveda.",
      "“Pura Vida” was borne out of this commitment to serve humanity through the genius of Ayurveda. Each and every product of Pura Vida is an outcome of painstakingly collected & researched herbal ingredients of Ayurvedic medicine used through centuries and contains an standardized content of actives, designed to have a remarkable effect on the internal body and skin naturally.",
    ],
  },
  {
    id: "global-trust",
    label: "Global Trust",
    icon: Globe2,
    paragraphs: [
      "“Pura Vida” is a name synonymous with nature and goodness of Ayurveda. It is one of the leading producers and suppliers of optimum quality herbal products to the Dietary Supplement, Cosmetic & personal care industry.",
      "Our products are thoroughly tested & well accepted world over. We have to our credit the leading Pharma & Netraceutical companies as satisfied & long term customers. Our strategic location in middle India, coupled with strategic partners of national & international repute, keeps logistics simple & efficient.",
    ],
  },
] as const;

export function WelcomeSection() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const prefersReducedMotion = useReducedMotion();

  // Respect the OS "reduce motion" setting throughout — this section is
  // the first thing a visitor meets, so it must not induce discomfort.
  const reveal = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <section
      id="welcome"
      aria-labelledby="welcome-heading"
      className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white py-20 lg:py-28"
    >
      {/* Ambient botanical wash */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-[26rem] w-[26rem] rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          {/* ── Left: copy ───────────────────────────────────── */}
          <motion.div {...reveal}>
            {/* Eyebrow */}
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#D4AF37]" />
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
                Welcome to Pura Vida
              </span>
            </div>

            <h2
              id="welcome-heading"
              className="font-heading text-3xl font-black leading-[1.1] tracking-tight text-emerald-600 sm:text-4xl lg:text-[2.9rem]"
            >
              Rooted in Ayurveda.
              <span className="block text-gray-900">
                Refined by Science.
              </span>
            </h2>

            {/* Tabs — a segmented control on a tinted track, so the
                active choice reads clearly and the inactive ones still
                look obviously clickable. */}
            <div
              role="tablist"
              aria-label="About Pura Vida"
              className="mt-8 inline-flex flex-wrap gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-1.5 shadow-sm backdrop-blur-sm"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2.5 rounded-xl px-5 py-3 text-[15px] font-bold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 ${
                      isActive
                        ? "text-white"
                        : "text-emerald-800/70 hover:bg-white/70 hover:text-emerald-700"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="welcome-tab-pill"
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald shadow-lg shadow-emerald/35 ring-1 ring-[#D4AF37]/40"
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 420, damping: 34 }
                        }
                      />
                    )}
                    <Icon
                      className={`relative z-10 h-[18px] w-[18px] ${
                        isActive ? "text-white" : "text-emerald-500"
                      }`}
                    />
                    <span className="relative z-10 whitespace-nowrap">
                      {tab.label}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="welcome-tab-dot"
                        aria-hidden="true"
                        className="relative z-10 h-1.5 w-1.5 rounded-full bg-[#D4AF37]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Panels.
                Every panel is rendered into the DOM and inactive ones are
                hidden with the `hidden` attribute, rather than mounting
                only the active one. Conditional mounting kept two thirds
                of the brand copy out of the server HTML entirely, so
                crawlers never saw it — the same problem the header had
                when it was client-only. */}
            <div className="relative mt-7 min-h-[15rem] sm:min-h-[13rem]">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <motion.div
                    key={tab.id}
                    role="tabpanel"
                    id={`panel-${tab.id}`}
                    aria-labelledby={`tab-${tab.id}`}
                    hidden={!isActive}
                    tabIndex={isActive ? 0 : -1}
                    animate={
                      prefersReducedMotion || !isActive
                        ? undefined
                        : { opacity: [0, 1], y: [12, 0] }
                    }
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="space-y-4 border-l-2 border-emerald-100 pl-5 focus:outline-none"
                  >
                    {tab.paragraphs.map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-[15px] leading-[1.85] text-gray-600 sm:text-base"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-9">
              <Link
                href="/about"
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald/20 transition-all duration-300 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2"
              >
                Read More About Us
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>

          {/* ── Right: leaf-framed portrait ───────────────────── */}
          <motion.div
            initial={
              prefersReducedMotion ? undefined : { opacity: 0, scale: 0.94 }
            }
            whileInView={
              prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }
            }
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[30rem]"
          >
            {/* True leaf silhouette: a square with two opposite corners
                fully rounded (50%) and the other two square. 9rem was
                too gentle to read as a leaf — this is unmistakable, and
                the radius is applied to the photo itself, not just a
                container behind it. */}
            <div
              aria-hidden="true"
              className="absolute -bottom-4 -right-4 hidden h-full w-full rounded-tl-[52%] rounded-br-[52%] border-2 border-[#D4AF37]/40 sm:block"
            />

            <div className="group relative overflow-hidden rounded-tl-[52%] rounded-br-[52%] shadow-2xl shadow-emerald-900/25 ring-1 ring-[#D4AF37]/40">
              <div className="relative aspect-square">
                <Image
                  src="/images/ab.jpg"
                  alt="Traditional Ayurvedic preparation — herbal oils, powders and botanicals used in Pura Vida formulations"
                  fill
                  sizes="(max-width: 1024px) 90vw, 480px"
                  quality={82}
                  className="scale-[1.02] object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.08]"
                />
              </div>
              {/* Depth wash so the leaf edges read as intentional */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-emerald-950/30 via-transparent to-transparent"
              />
            </div>

            {/* Leaf midrib — the diagonal vein between the two points */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex"
            >
              <span className="h-[128%] w-px rotate-45 bg-gradient-to-b from-transparent via-[#D4AF37]/35 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
