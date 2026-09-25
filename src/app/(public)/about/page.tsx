import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  FlaskConical,
  Globe2,
  Leaf,
  Microscope,
  PackageCheck,
  ShieldCheck,
  Sprout,
  Truck,
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { ImageBand } from "@/components/shared/ImageBand";
import { COMPANY } from "@/lib/constants";
import { businessProfile } from "@/data/navigation";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Mankind has always turned back to Mother Earth for disease free pure & simple Life – Pura Vida. Learn how PuraVida Natural serves humanity through the genius of Ayurveda.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    title: "Our Story | PuraVida Natural",
    description:
      "Born out of a commitment to serve humanity through the genius of Ayurveda — standardized botanical ingredients trusted worldwide.",
    url: "/about",
  },
};

const STORY_IMAGES = [
  { src: "/images/b1.webp", alt: "Natural botanical ingredients sourced for Ayurvedic formulations", span: "col-span-1" },
  { src: "/images/middile2.webp", alt: "Traditional Ayurvedic herbs, oils and preparations", span: "col-span-1" },
  { src: "/images/b2.webp", alt: "Herbal extracts and botanical raw materials", span: "col-span-2" },
  { src: "/images/b3.webp", alt: "Medicinal flowers and plants used in Ayurveda", span: "col-span-1" },
  { src: "/images/middile3.webp", alt: "Mortar and pestle with herbal capsules and fresh botanicals", span: "col-span-1" },
];

const CAPABILITIES = [
  {
    icon: Microscope,
    image: "/Factory_Images/HPLCs.jpg.webp",
    title: "Analytical laboratory",
    body: "HPLC-driven testing verifies the standardized content of actives in every batch before it leaves us.",
  },
  {
    icon: FlaskConical,
    image: "/Factory_Images/herbal extraction pl.webp",
    title: "Extraction plant",
    body: "Purpose-built extraction lines capture the full bioactive profile of each botanical at peak potency.",
  },
  {
    icon: Sprout,
    image: "/Factory_Images/Pure ingredient Lab .webp",
    title: "Pure ingredient sourcing",
    body: "Cooperative manufacturing across India's resource-rich states keeps raw material quality consistent.",
  },
];

const VALUES = [
  { icon: Leaf, title: "Quality", body: "Standardized actives, verified batch by batch." },
  { icon: ShieldCheck, title: "Responsibility", body: "Everything done under the law of the country." },
  { icon: Award, title: "Commitment", body: "Serving humanity through the genius of Ayurveda." },
  { icon: PackageCheck, title: "Consistency", body: "The same specification, order after order." },
  { icon: Globe2, title: "Great service", body: "Long term relationships over one-off transactions." },
  { icon: Truck, title: "Efficient logistics", body: "Strategic location in middle India keeps delivery simple." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="Our Story"
        // Deliberately not the opening line of the narrative below —
        // repeating it verbatim two blocks apart reads as an error.
        subtitle="Serving humanity through the genius of Ayurveda since 2000."
        image="/images/middile1.webp"
        imageAlt="Fresh green botanical leaves — the source of PuraVida Natural's ingredients"
        crumbs={[{ label: "Home", href: "/" }, { label: "Our Story" }]}
      />

      {/* ── Our Story: collage + narrative ─────────────────────── */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-20 h-[28rem] w-[28rem] rounded-full bg-emerald-50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Our Story
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl lg:text-[2.75rem]">
              Rooted in the Veda philosophy
            </h2>
            <span
              aria-hidden="true"
              className="mx-auto mt-6 block h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Collage */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {STORY_IMAGES.map((img, index) => (
                <div
                  key={img.src}
                  className={`group relative overflow-hidden rounded-2xl shadow-md ring-1 ring-emerald-900/5 ${img.span} ${
                    index === 2 ? "aspect-[2.4/1]" : "aspect-[4/3]"
                  }`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 1024px) 45vw, 300px"
                    quality={82}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-emerald-950/0 transition-colors duration-500 group-hover:bg-emerald-950/10"
                  />
                </div>
              ))}
            </div>

            {/* Narrative — copy preserved verbatim */}
            <div className="space-y-6">
              <p className="text-[17px] leading-[1.9] text-gray-600">
                Mankind has always turned back to Mother Earth for disease free
                pure &amp; simple Life – Pura Vida. At Pura Vida, We believe in
                the Veda philosophy, which says that nature has always an
                abundance of plants, roots, flowers and herbs rich in vitamins,
                enzymes, proteins and minerals that have been used in body and
                skin-care in Indian system of medicine Ayurveda.
              </p>

              {/* Editorial pull-quote.
                  The flat green wash read as a disabled input and the
                  copy ran as one 90-word block. Now a raised card with
                  a dark header band, a real quote mark, and the text
                  split at its natural break — same words, far easier
                  to actually read. */}
              <figure className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/5">
                <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-700 to-emerald px-6 py-3.5">
                  <Leaf className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/95">
                    Our Commitment
                  </span>
                </div>

                <blockquote className="relative px-6 py-7 sm:px-8">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-5 top-1 select-none font-heading text-[7rem] leading-none text-emerald-100"
                  >
                    &rdquo;
                  </span>

                  <p className="relative text-[17px] leading-[1.9] text-gray-700">
                    <span className="float-left mr-2.5 mt-1 font-heading text-[3.25rem] font-black leading-[0.78] text-emerald-600">
                      “P
                    </span>
                    ura Vida” was borne out of this commitment to serve humanity
                    through the genius of Ayurveda. Each and every product of
                    Pura Vida is an outcome of painstakingly collected &amp;
                    researched herbal ingredients of Ayurvedic medicine used
                    through centuries and contains an standardized content of
                    actives, designed to have a remarkable effect on the internal
                    body and skin naturally.
                  </p>

                  <span
                    aria-hidden="true"
                    className="my-5 block h-px w-full bg-gradient-to-r from-[#D4AF37]/50 via-emerald-100 to-transparent"
                  />

                  <p className="relative text-[17px] leading-[1.9] text-gray-700">
                    “Pura Vida” is a name synonymous with nature and goodness of
                    Ayurveda. It is one of the leading producers and suppliers of
                    optimum quality herbal products to the{" "}
                    <strong className="font-semibold text-emerald-700">
                      Dietary Supplement, Cosmetic &amp; personal care industry
                    </strong>
                    .
                  </p>
                </blockquote>
              </figure>

              <p className="text-[17px] leading-[1.9] text-gray-600">
                Our products are thoroughly tested &amp; well accepted world
                over. We have to our credit the leading Pharma &amp;
                Netraceutical companies as satisfied &amp; long term customers.
                Our strategic location in middle India, coupled with strategic
                partners of national &amp; international repute, keeps logistics
                simple &amp; efficient.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                {["FSSAI Licensed", "Halal India", "14+ Years"].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interstitial band ──────────────────────────────────── */}
      <ImageBand
        image="/images/banner1.webp"
        imageAlt="Botanical field — nature's abundance of plants, roots, flowers and herbs"
        quote="Nature has always an abundance of plants, roots, flowers and herbs rich in vitamins, enzymes, proteins and minerals."
        attribution="The Veda philosophy"
        height="md"
      />

      {/* ── Values ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-emerald-50/50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              What We Stand For
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
              The standard of action
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
              Quality, responsibility, commitment, consistency and great service
              are among other values that set the standard of action to build
              long term business relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="group rounded-2xl border border-emerald-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-emerald/30 hover:shadow-xl hover:shadow-emerald/10"
                >
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                    <Icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {value.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Capability / facility ──────────────────────────────── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Facility &amp; Capability
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
              Thoroughly tested, world over
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="group overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald/10"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 380px"
                      quality={82}
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 to-transparent"
                    />
                    <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-lg backdrop-blur-sm">
                      <Icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-heading text-lg font-bold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {item.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Business profile ───────────────────────────────────── */}
      <section className="bg-emerald-50/60 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-tl-[42%] rounded-br-[42%] shadow-2xl shadow-emerald-900/20 ring-1 ring-[#D4AF37]/40">
                <Image
                  src="/Factory_Images/006.webp"
                  alt="PuraVida Natural manufacturing and processing facility"
                  fill
                  sizes="(max-width: 1024px) 90vw, 420px"
                  quality={82}
                  className="scale-[1.02] object-cover"
                />
              </div>
              <div
                aria-hidden="true"
                className="absolute -bottom-4 -right-4 hidden h-full w-full rounded-tl-[42%] rounded-br-[42%] border-2 border-[#D4AF37]/40 lg:block"
              />
            </div>

            <div>
              <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
                Business Profile
              </span>
              <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
                Built for long term partnerships
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Established in India, the country of Ayurveda — dedicated to
                manufacturing, commercialization and distribution of natural
                botanical extracts, herb powders and essential oils.
              </p>

              <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-100 sm:grid-cols-2">
                {businessProfile.map((item) => (
                  <div key={item.label} className="bg-white px-5 py-4">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden py-20 lg:py-24">
        <Image
          src="/images/middile4.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          quality={80}
          className="-z-10 object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-emerald-950/85"
        />

        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">
            Let&apos;s build something lasting
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">
            Tell us the specification you need and our team will respond with
            pricing, MOQ and technical documentation.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-emerald-800 shadow-lg transition-all duration-300 hover:bg-emerald-50 hover:shadow-xl"
            >
              Request a quote
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition-colors duration-300 hover:bg-white/10"
            >
              Browse our range
            </Link>
          </div>
          <p className="mt-8 text-sm text-white/60">
            {COMPANY.address} · {COMPANY.phone}
          </p>
        </div>
      </section>
    </>
  );
}
