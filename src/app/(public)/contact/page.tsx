"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Trash2,
  Search,
  Plus,
  Loader2,
  Clock,
  ShieldCheck,
  FlaskConical,
  Mail,
  Phone,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useCartStore } from "@/stores/useCartStore";
import { QuoteLineFields } from "@/components/quote/QuoteLineFields";
import { COMPANY } from "@/lib/constants";
import { COUNTRY_NAMES, TOP_COUNTRIES } from "@/lib/countries";
import { attribution, track } from "@/lib/track";
import type { Product } from "@/types";

type FormStatus = "idle" | "submitting" | "success" | "error";

const BUYER_TYPES = ["Manufacturer / Formulator", "Brand owner", "Trader / Distributor", "Researcher / Lab", "Other"] as const;

const fieldClass =
  "h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm transition-colors placeholder:text-gray-400 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20";

/** A product the buyer typed that isn't in the catalogue; the server still tries to match it. */
function customProduct(name: string): Product {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return {
    id: `custom:${slug}`,
    name,
    slug,
    category: "Custom request",
    categorySlug: "",
    applications: [],
    description: "",
    image: "",
    qualityBadges: [],
    isHalal: false,
    popularity: 0,
  };
}

function ProductPicker() {
  const addItem = useCartStore((s) => s.addItem);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(term)}&limit=6`, { signal: ctrl.signal });
        if (res.ok) setResults((await res.json()) as Product[]);
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (p: Product) => {
    addItem(p, undefined, { open: false });
    setQ("");
    setResults([]);
    setOpen(false);
  };
  const options = [...results.map((p) => ({ kind: "product" as const, p })), ...(q.trim().length >= 2 ? [{ kind: "custom" as const, p: customProduct(q.trim()) }] : [])];

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      <input
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls="product-options"
        aria-label="Search products to add"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && options[active]) {
            e.preventDefault();
            pick(options[active].p);
          }
        }}
        placeholder="Search our catalogue, e.g. ashwagandha, curcumin, peppermint oil"
        className={`${fieldClass} pl-11`}
      />
      {loading && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
      <AnimatePresence>
        {open && options.length > 0 && (
          <motion.ul
            id="product-options"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
          >
            {options.map((o, i) => (
              <li key={o.p.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.p)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${i === active ? "bg-emerald-50" : ""}`}
                >
                  {o.kind === "product" ? (
                    <>
                      <span className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                        {o.p.image && <Image src={o.p.image} alt="" fill sizes="36px" className="object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-900">{o.p.name}</span>
                        <span className="block truncate text-xs text-gray-500">{o.p.botanicalName || o.p.category}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 text-gray-700">
                        Add “<strong className="text-gray-900">{o.p.name}</strong>” as a custom request
                      </span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ContactPage() {
  const { items, removeItem, updateLine, clear } = useCartStore();
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    country: "",
    buyerType: "" as "" | (typeof BUYER_TYPES)[number],
    message: "",
    wantsSamples: false,
  });
  // Honeypot: hidden from real users, so any value means a bot.
  const [companyWebsite, setCompanyWebsite] = useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (!started) {
      setStarted(true);
      track("form_start");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    setFieldErrors({});

    const a = attribution();
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          country: form.country,
          buyerType: form.buyerType || null,
          message: form.message,
          wantsSamples: form.wantsSamples,
          items: items.map((i) => ({
            productId: i.product.id.startsWith("custom:") ? null : i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            unit: i.unit,
            grade: i.grade || null,
          })),
          sourcePage: typeof document !== "undefined" ? document.referrer || null : null,
          referrer: a.referrer,
          utm: a.utm,
          company_website: companyWebsite,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        reference?: string;
        error?: string;
        fields?: Record<string, string>;
      };
      if (res.ok) {
        setReference(payload.reference ?? null);
        setStatus("success");
        track("form_submit", { items: items.length });
        clear();
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        return;
      }
      if (payload.fields) setFieldErrors(payload.fields);
      setErrorMessage(payload.fields ? Object.values(payload.fields)[0] ?? payload.error ?? null : payload.error ?? null);
      setStatus("error");
    } catch {
      setErrorMessage("We couldn't reach the server. Please check your connection and try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 pb-20 pt-[11rem] lg:pt-[13rem]">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="max-w-lg text-center"
        >
          <motion.div
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
          >
            <CheckCircle className="h-8 w-8 text-emerald" />
          </motion.div>
          <h1 className="mb-2 font-heading text-3xl font-bold text-gray-900">Quote request received</h1>
          <p className="mb-2 text-gray-600">
            We&apos;ve emailed you a copy. Our team will reply with pricing, MOQ and specifications within one business day.
          </p>
          {reference && (
            <p className="mb-8 text-sm text-gray-500">
              Your reference: <strong className="font-mono text-gray-900">{reference}</strong>
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/products"
              className="btn-shine inline-flex h-12 items-center rounded-xl bg-orange-500 px-6 font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
            >
              Browse more products
            </Link>
            <button
              onClick={() => setStatus("idle")}
              className="inline-flex h-12 items-center rounded-xl border border-gray-200 px-6 font-semibold text-gray-700 hover:border-emerald hover:text-emerald-700"
            >
              Send another request
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const err = (k: string) =>
    fieldErrors[k] ? <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors[k]}</p> : null;

  return (
    <div className="pb-16 pt-[9.5rem] lg:pb-24 lg:pt-[11.5rem]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="no-scrollbar mb-8 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-emerald">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-gray-900">Request a Quote</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
          <div id="quote" className="scroll-mt-40">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Get in touch
            </span>
            <h1 className="font-heading text-4xl font-black tracking-tight text-emerald-600 sm:text-5xl">Request a Quote</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              Add the products you need and we&apos;ll reply with pricing, MOQ, specifications and sample availability,
              usually within one business day.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-10" noValidate>
              {/* Honeypot: hidden from sighted users and screen readers. */}
              <div aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
                <label htmlFor="company_website">Company website (leave blank)</label>
                <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
              </div>

              {/* ── 1 · Products ─────────────────────────────── */}
              <section aria-labelledby="step-products">
                <h2 id="step-products" className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald text-xs font-bold text-white">1</span>
                  Products
                </h2>
                <p className="mb-4 text-sm text-gray-500">Search the catalogue, or type anything we should source for you.</p>
                <ProductPicker />
                {err("items")}

                <ul className="mt-4 space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map((line) => (
                      <motion.li
                        key={line.product.id}
                        layout={!reduce}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, x: 30, transition: { duration: 0.15 } }}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-gray-900">{line.product.name}</p>
                            <p className="truncate text-xs text-gray-500">
                              {line.product.id.startsWith("custom:") ? "Custom request, we'll match it to our range" : line.product.botanicalName || line.product.category}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(line.product.id)}
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remove ${line.product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <QuoteLineFields line={line} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {items.length === 0 && (
                  <p className="mt-3 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
                    No products added yet. You can also just describe what you need in the message below.
                  </p>
                )}
              </section>

              {/* ── 2 · Your details ─────────────────────────── */}
              <section aria-labelledby="step-details">
                <h2 id="step-details" className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald text-xs font-bold text-white">2</span>
                  Your details
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">Full name *</label>
                    <Input id="name" autoComplete="name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" className="h-12 rounded-xl" />
                    {err("name")}
                  </div>
                  <div>
                    <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-gray-700">Company</label>
                    <Input id="company" autoComplete="organization" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" className="h-12 rounded-xl" />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Work email *</label>
                    <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" className="h-12 rounded-xl" />
                    {err("email")}
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">Phone / WhatsApp</label>
                    <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98xxx xxxxx" className="h-12 rounded-xl" />
                  </div>
                  <div>
                    <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-gray-700">Country</label>
                    <select id="country" autoComplete="country-name" value={form.country} onChange={(e) => set("country", e.target.value)} className={fieldClass}>
                      <option value="">Select country</option>
                      <optgroup label="Frequent">
                        {TOP_COUNTRIES.map((c) => (
                          <option key={`top-${c}`} value={c}>{c}</option>
                        ))}
                      </optgroup>
                      <optgroup label="All countries">
                        {COUNTRY_NAMES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="buyerType" className="mb-1.5 block text-sm font-medium text-gray-700">You are a…</label>
                    <select id="buyerType" value={form.buyerType} onChange={(e) => set("buyerType", e.target.value as typeof form.buyerType)} className={fieldClass}>
                      <option value="">Select</option>
                      {BUYER_TYPES.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* ── 3 · Anything else ────────────────────────── */}
              <section aria-labelledby="step-message">
                <h2 id="step-message" className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald text-xs font-bold text-white">3</span>
                  Anything else?
                </h2>
                <textarea
                  id="message"
                  aria-label="Message"
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  rows={4}
                  placeholder="Specifications, target price, destination port, certifications you need, delivery timeline…"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm placeholder:text-gray-400 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20"
                />
                <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.wantsSamples}
                    onChange={(e) => set("wantsSamples", e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-emerald focus:ring-emerald"
                  />
                  I&apos;d like samples for evaluation
                </label>
              </section>

              {status === "error" && (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage ?? "Something went wrong. Please try again or email us directly."}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="btn-shine group inline-flex h-[3.25rem] min-w-[220px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send quote request
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500">
                  You&apos;ll get an email copy straight away. We never share your details.
                </p>
              </div>
            </form>
          </div>

          {/* ── Sidebar ─────────────────────────────────────── */}
          <aside className="space-y-5 lg:sticky lg:top-40 lg:self-start">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald p-6 text-white shadow-lg shadow-emerald/20">
              <h2 className="mb-4 text-lg font-bold">Talk to us directly</h2>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-200" />
                  <a href={`mailto:${COMPANY.salesEmail}`} className="font-medium hover:underline">{COMPANY.salesEmail}</a>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-200" />
                  <a href={`tel:${COMPANY.phone}`} className="font-medium hover:underline">{COMPANY.phone}</a>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-200" />
                  <span className="font-medium">{COMPANY.hours}</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900">What you get</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  [Clock, "Reply within one business day"],
                  [FlaskConical, "Specifications and MOQ with every quote"],
                  [ShieldCheck, `FSSAI licensed · Lic. ${COMPANY.fssaiLicense}`],
                  [CheckCircle, "Samples available for evaluation"],
                ].map(([Icon, text]) => {
                  const I = Icon as typeof Clock;
                  return (
                    <li key={text as string} className="flex items-start gap-2.5">
                      <I className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" />
                      {text as string}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
