import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Beaker,
  Droplets,
  FlaskConical,
  Leaf,
  Palette,
  Pill,
  Sparkles,
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { ImageBand } from "@/components/shared/ImageBand";

export const metadata: Metadata = {
  title: "Our Business",
  description:
    "We at Pura Vida take best out of Natural Herbs, in the form best suitable for application in Industries Pharmaceuticals, cosmeceutical & Neutraceutical, Health Food, Flavor & Perfumery.",
  alternates: { canonical: "/our-business" },
  openGraph: {
    type: "website",
    title: "Our Business | PuraVida Natural",
    description:
      "Botanical herb powders, standardized herbal extracts, essential & fixed oils, food colors & flavors, phytochemicals and health supplements.",
    url: "/our-business",
  },
};

const PRODUCT_FORMS = [
  {
    icon: Leaf,
    title: "Botanicals Herb Powders",
    body: "Authenticated raw herbs, cleaned, milled and sieved to a consistent particle size.",
  },
  {
    icon: FlaskConical,
    title: "Standardized Herbal Extracts",
    body: "Extracts standardized to a defined content of actives, batch after batch.",
  },
  {
    icon: Droplets,
    title: "Essential & Fixed Oils",
    body: "Steam-distilled and cold-pressed oils that retain their full aromatic profile.",
  },
  {
    icon: Palette,
    title: "Food Colors & Flavors",
    body: "Naturally derived colors and flavors for food and beverage applications.",
  },
  {
    icon: Beaker,
    title: "Phytochemicals",
    body: "High-purity isolates for pharmaceutical, nutraceutical and research use.",
  },
  {
    icon: Pill,
    title: "Food & Health Supplements",
    body: "Finished and semi-finished ingredients for the dietary supplement industry.",
  },
];

const INDUSTRIES_SERVED = [
  "Pharmaceuticals",
  "Cosmeceutical",
  "Neutraceutical",
  "Health Food",
  "Flavor & Perfumery",
];

export default function OurBusinessPage() {
  return (
    <>
      <PageHero
        title="Our Business"
        subtitle="Taking the best out of natural herbs — in the form best suited to your application."
        image="/images/middile3.webp"
        imageAlt="Herbal capsules, mortar and botanical ingredients"
        crumbs={[{ label: "Home", href: "/" }, { label: "Our Business" }]}
      />

      {/* ── Intro + product forms ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-24 h-[26rem] w-[26rem] rounded-full bg-emerald-50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
                What We Do
              </span>
              <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
                The best of natural herbs
              </h2>
              <p className="mt-5 text-[17px] leading-[1.9] text-gray-600">
                We at Pura Vida take best out of Natural Herbs, in the form best
                suitable for application in Industries Pharmaceuticals,
                cosmeceutical &amp; Neutraceutical, Health Food, Flavor &amp;
                Perfumery.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {INDUSTRIES_SERVED.map((industry) => (
                  <span
                    key={industry}
                    className="rounded-full border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-xs font-bold text-emerald-700"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative col-span-2 aspect-[2.4/1] overflow-hidden rounded-2xl shadow-md ring-1 ring-emerald-900/5">
                <Image
                  src="/images/b2.webp"
                  alt="Botanical raw materials and herbal extracts"
                  fill
                  sizes="(max-width: 1024px) 90vw, 560px"
                  quality={82}
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md ring-1 ring-emerald-900/5">
                <Image
                  src="/images/b1.webp"
                  alt="Natural herbs prepared for processing"
                  fill
                  sizes="270px"
                  quality={82}
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md ring-1 ring-emerald-900/5">
                <Image
                  src="/images/middile2.webp"
                  alt="Traditional Ayurvedic oils and preparations"
                  fill
                  sizes="270px"
                  quality={82}
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Product forms */}
          <div className="mt-20">
            <div className="mb-12 max-w-2xl">
              <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
                Product Forms
              </span>
              <h3 className="font-heading text-2xl font-black tracking-tight text-emerald-600 sm:text-3xl">
                Our product form includes
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCT_FORMS.map((form, index) => {
                const Icon = form.icon;
                return (
                  <div
                    key={form.title}
                    className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-emerald/30 hover:shadow-xl hover:shadow-emerald/10"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute right-5 top-4 font-heading text-5xl font-black text-emerald-50 transition-colors group-hover:text-emerald-100"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                      <Icon
                        className="h-5 w-5 text-emerald-600"
                        aria-hidden="true"
                      />
                    </span>
                    <h4 className="relative font-heading text-lg font-bold text-gray-900">
                      {form.title}
                    </h4>
                    <p className="relative mt-2 text-sm leading-relaxed text-gray-600">
                      {form.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <ImageBand
        image="/images/banner2.webp"
        imageAlt="Botanical processing and herbal ingredient preparation"
        quote="High-quality ingredient selection with cooperative manufacturing presence across India's natural resource rich states."
        attribution="Our core competency"
        height="md"
      />

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="bg-emerald-50/60 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sparkles
            className="mx-auto mb-4 h-7 w-7 text-[#D4AF37]"
            aria-hidden="true"
          />
          <h2 className="font-heading text-2xl font-black tracking-tight text-emerald-600 sm:text-3xl">
            Looking for a specific form or specification?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            Tell us the application and we&apos;ll recommend the right product
            form, grade and packaging.
          </p>
          <Link
            href="/contact"
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald/20 transition-all duration-300 hover:bg-emerald-600 hover:shadow-xl"
          >
            Talk to our team
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
