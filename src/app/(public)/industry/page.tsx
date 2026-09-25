import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Beef,
  Coffee,
  Flower2,
  HeartPulse,
  Pill,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { ImageBand } from "@/components/shared/ImageBand";

export const metadata: Metadata = {
  title: "Industry",
  description:
    "At Pura Vida, we believe in understanding & meeting client requirements. Approved across dietary supplements, pharmaceuticals, flavour & fragrance, personal care, food & beverages, wellness and animal health.",
  alternates: { canonical: "/industry" },
  openGraph: {
    type: "website",
    title: "Industry | PuraVida Natural",
    description:
      "Serving dietary supplements, pharmaceuticals, flavour & fragrance houses, personal care, food & beverages, wellness & spa and animal health.",
    url: "/industry",
  },
};

const SEGMENTS = [
  { icon: Pill, title: "Dietary Supplements", body: "Standardized actives for capsules, tablets and powders." },
  { icon: Stethoscope, title: "Pharmaceuticals", body: "Botanical inputs meeting pharmacopoeial specifications." },
  { icon: Flower2, title: "Flavour & Fragrance Houses", body: "Essential oils and aromatics with a consistent profile." },
  { icon: Sparkles, title: "Personal Care & Cosmetics", body: "Skin- and hair-care actives from Ayurvedic botanicals." },
  { icon: Coffee, title: "Food & Beverages", body: "Natural colours, flavours and functional ingredients." },
  { icon: HeartPulse, title: "Wellness & Spa", body: "Massage oils, herbal powders and therapeutic blends." },
  { icon: Beef, title: "Animal Health", body: "Phytogenic ingredients for veterinary and feed applications." },
];

export default function IndustryPage() {
  return (
    <>
      <PageHero
        title="Industry"
        subtitle="Understanding and meeting client requirements across seven approved segments."
        image="/images/middile4.webp"
        imageAlt="Mortar and pestle with fresh botanicals"
        crumbs={[{ label: "Home", href: "/" }, { label: "Industry" }]}
      />

      {/* ── Intro ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-16 h-[26rem] w-[26rem] rounded-full bg-emerald-50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md ring-1 ring-emerald-900/5">
                <Image
                  src="/images/b1.webp"
                  alt="Natural botanical ingredients"
                  fill
                  sizes="270px"
                  quality={82}
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md ring-1 ring-emerald-900/5">
                <Image
                  src="/images/middile2.webp"
                  alt="Ayurvedic oils and herbal preparations"
                  fill
                  sizes="270px"
                  quality={82}
                  className="object-cover"
                />
              </div>
              <div className="relative col-span-2 aspect-[2.4/1] overflow-hidden rounded-2xl shadow-md ring-1 ring-emerald-900/5">
                <Image
                  src="/images/middile3.webp"
                  alt="Herbal capsules with fresh medicinal plants"
                  fill
                  sizes="(max-width: 1024px) 90vw, 560px"
                  quality={82}
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
                Industry
              </span>
              <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
                Approved where it matters
              </h2>
              <p className="mt-5 text-[17px] leading-[1.9] text-gray-600">
                At Pura Vida, we believe in understanding &amp; meeting client
                requirements. Our young &amp; dynamic team of technicians &amp;
                professionals, along with strong network at Farmer level supply
                sources in Indian natural resource rich states makes all the
                difference. We produce wide range of products and are priviledged
                of being approved in following Industry segments.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
                <div>
                  <p className="font-heading text-3xl font-black text-emerald-600">
                    7
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Industry segments
                  </p>
                </div>
                <div>
                  <p className="font-heading text-3xl font-black text-emerald-600">
                    14+
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Years of experience
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Segments ───────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-emerald-50/50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Segments
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
              Where our ingredients go
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SEGMENTS.map((segment) => {
              const Icon = segment.icon;
              return (
                <div
                  key={segment.title}
                  className="group rounded-2xl border border-emerald-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald/30 hover:shadow-xl hover:shadow-emerald/10"
                >
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                    <Icon
                      className="h-5 w-5 text-emerald-600"
                      aria-hidden="true"
                    />
                  </span>
                  <h3 className="font-heading text-base font-bold leading-snug text-gray-900">
                    {segment.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {segment.body}
                  </p>
                </div>
              );
            })}

            {/* CTA tile completes the 8-cell grid */}
            <Link
              href="/contact"
              className="group flex flex-col justify-between rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald p-6 text-white shadow-lg shadow-emerald/25 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <ArrowRight className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-heading text-base font-bold">
                  Your segment not listed?
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-white/80">
                  Tell us the application — we very likely already supply it.
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <ImageBand
        image="/images/banner1.webp"
        imageAlt="Farmer-level botanical supply network across India"
        quote="A strong network at Farmer level supply sources in Indian natural resource rich states makes all the difference."
        attribution="Our supply chain"
        height="md"
      />
    </>
  );
}
