"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Mail } from "lucide-react";

// ─── Slide Data ───────────────────────────────────────────────────────────────
const slides = [
  {
    id: 0,
    image: "/herosectioncarousel/Ancient%20Meets%20Modern.png",
    headline: ["CURED BY NATURE.", "PERFECTED BY SCIENCE."],
    sub: "State-of-the-art extraction processes that preserve nature's most potent bioactive compounds.",
    align: "left" as const,
  },
  {
    id: 2,
    image: "/herosectioncarousel/Herbal%20Extraction.png",
    headline: ["PURE BOTANICAL", "EXCELLENCE"],
    sub: "Standardized extracts that capture the full healing spectrum of the world's most revered medicinal plants.",
    align: "left" as const,
  },
  {
    id: 3,
    image: "/herosectioncarousel/HPLCs.-factory.png",
    headline: ["PRECISION AT", "EVERY STAGE"],
    sub: "Advanced HPLC analytics and rigorous quality protocols ensuring uncompromised purity and potency.",
    align: "center" as const,
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────
const imageVariants = {
  enter: { opacity: 0 },
  center: {
    opacity: 1,
    transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 1.0, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

const scaleVariants = {
  enter: { scale: 1.08 },
  center: {
    scale: 1.0,
    transition: { duration: 7, ease: "linear" as const },
  },
  exit: { scale: 1.0 },
};

const headlineVariants = {
  hidden: { opacity: 0, y: 60, skewY: 3 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay: 0.35 + i * 0.12,
    },
  }),
  exit: { opacity: 0, y: -30, transition: { duration: 0.4 } },
};

const subVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.65 },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const ctaVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.85 },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

// ─── Component ────────────────────────────────────────────────────────────────
export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const SLIDE_DURATION = 6000;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
    setProgress(0);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setProgress(0);
      setCurrent((prev) => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Progress ticker
  useEffect(() => {
    if (isPaused) return;
    setProgress(0);
    const start = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      setProgress(Math.min(elapsed / SLIDE_DURATION, 1));
      if (elapsed < SLIDE_DURATION) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [current, isPaused]);

  const slide = slides[current];
  const isCenter = slide.align === "center";

  return (
    <section
      className="relative h-screen w-full overflow-hidden"
      style={{ backgroundColor: "#062C1D" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Background Images ─────────────────────────────────────── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${current}`}
          variants={imageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 z-0"
        >
          <motion.div
            variants={scaleVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <Image
              src={slide.image}
              alt={slide.headline.join(" ")}
              fill
              priority
              sizes="100vw"
              quality={90}
              className="object-cover object-center"
            />
          </motion.div>

          {/* Layered dark gradients for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background: isCenter
                ? "linear-gradient(to bottom, rgba(6,44,29,0.55) 0%, rgba(6,44,29,0.25) 40%, rgba(6,44,29,0.65) 100%)"
                : "linear-gradient(105deg, rgba(6,44,29,0.82) 0%, rgba(6,44,29,0.55) 45%, rgba(6,44,29,0.18) 100%)",
            }}
          />
          {/* Bottom vignette */}
          <div
            className="absolute bottom-0 left-0 right-0 h-40"
            style={{
              background:
                "linear-gradient(to top, rgba(6,44,29,0.85) 0%, transparent 100%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Gold line accent (top) ──────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] z-20"
        style={{ background: "linear-gradient(90deg, transparent, #D4AF37 50%, transparent)" }}
      />

      {/* ── Text Content ───────────────────────────────────────────── */}
      <div
        className={`relative z-10 h-full flex flex-col justify-center px-8 md:px-16 lg:px-24 ${
          isCenter ? "items-center text-center" : "items-start text-left"
        } max-w-7xl ${isCenter ? "mx-auto" : ""}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${current}`}
            className={`flex flex-col gap-5 ${isCenter ? "items-center" : "items-start"}`}
          >
            {/* Headline */}
            <div className="overflow-hidden">
              {slide.headline.map((line, i) => (
                <div key={i} className="overflow-hidden">
                  <motion.h1
                    custom={i}
                    variants={headlineVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="block font-black uppercase leading-[0.95] tracking-tight"
                    style={{
                      fontSize: "clamp(1.82rem, 4.2vw, 3.85rem)",
                      color: "#FFFFFF",
                      fontFamily: "var(--font-space-grotesk, sans-serif)",
                      WebkitFontSmoothing: "antialiased",
                      letterSpacing: "-0.01em",
                      textShadow: "0 2px 40px rgba(6,44,29,0.4)",
                    }}
                  >
                    {line}
                  </motion.h1>
                </div>
              ))}
            </div>

            {/* Gold divider */}
            <motion.div
              variants={subVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                width: isCenter ? "80px" : "60px",
                height: "2px",
                background: "linear-gradient(90deg, #D4AF37, rgba(212,175,55,0.3))",
                margin: isCenter ? "4px auto" : "4px 0",
              }}
            />

            {/* Sub-headline */}
            <motion.p
              variants={subVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="leading-relaxed font-light"
              style={{
                color: "rgba(255,255,255,0.82)",
                letterSpacing: "0.06em",
                fontSize: "clamp(0.9rem, 1.4vw, 1.15rem)",
                maxWidth: "520px",
              }}
            >
              {slide.sub}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={ctaVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-wrap items-center gap-4 mt-2"
            >
              {/* Primary – Discover */}
              <Link
                href="/products"
                className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg font-semibold text-sm tracking-[0.12em] uppercase overflow-hidden transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #B8952A 100%)",
                  color: "#062C1D",
                  boxShadow: "0 0 0 0 rgba(212,175,55,0)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 24px 4px rgba(212,175,55,0.35), 0 4px 16px rgba(0,0,0,0.3)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 0 rgba(212,175,55,0)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <span className="relative z-10">Discover Extracts</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Glassmorphism – Send Inquiry */}
              <Link
                href="/contact"
                className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg font-medium text-sm tracking-[0.12em] uppercase transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(212,175,55,0.35)",
                  color: "#F5E6B2",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 0 rgba(212,175,55,0)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(212,175,55,0.12)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(212,175,55,0.7)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px 4px rgba(212,175,55,0.2)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(212,175,55,0.35)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 0 rgba(212,175,55,0)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <Mail className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Send Inquiry</span>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide Counter ──────────────────────────────────────────── */}
      <div
        className="absolute bottom-10 right-8 md:right-16 lg:right-24 z-20 flex flex-col items-end gap-3"
      >
        {/* Number */}
        <AnimatePresence mode="wait">
          <motion.span
            key={`num-${current}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
            className="font-black"
            style={{
              fontSize: "3.5rem",
              lineHeight: 1,
              color: "rgba(212,175,55,0.15)",
              fontFamily: "var(--font-space-grotesk, sans-serif)",
            }}
          >
            {String(current + 1).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setProgress(0); }}
              className="relative overflow-hidden rounded-full transition-all duration-300"
              style={{
                width: i === current ? "28px" : "6px",
                height: "6px",
                background:
                  i === current
                    ? "rgba(212,175,55,0.3)"
                    : "rgba(255,255,255,0.25)",
              }}
              aria-label={`Go to slide ${i + 1}`}
            >
              {i === current && (
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: "#D4AF37", width: `${progress * 100}%` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Prev / Next Arrows ─────────────────────────────────────── */}
      <div className="absolute bottom-8 left-8 md:left-16 lg:left-24 z-20 flex items-center gap-3">
        <button
          onClick={prev}
          className="group w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(212,175,55,0.15)";
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(212,175,55,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(255,255,255,0.15)";
          }}
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={next}
          className="group w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(212,175,55,0.15)";
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(212,175,55,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(255,255,255,0.15)";
          }}
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scroll hint ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      >
        <span
          className="text-[10px] tracking-[0.25em] uppercase"
          style={{ color: "rgba(212,175,55,0.5)" }}
        >
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-8"
          style={{
            background:
              "linear-gradient(to bottom, rgba(212,175,55,0.6), transparent)",
          }}
        />
      </motion.div>
    </section>
  );
}
