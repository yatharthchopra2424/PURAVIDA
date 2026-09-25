import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Network, TrendingUp } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { ImageBand } from "@/components/shared/ImageBand";

export const metadata: Metadata = {
  title: "Pura Vida Advantage",
  description:
    "14+ years in the herbal industry: standardized botanical powders and extracts, sourced across India and supplied to manufacturers and brands at home and abroad.",
  alternates: { canonical: "/advantage" },
  openGraph: {
    type: "website",
    title: "Pura Vida Advantage | PuraVida Natural",
    description:
      "Techno-commercial experience, deep industry understanding, and strategic agility that goes beyond balance sheets.",
    url: "/advantage",
  },
};

const ADVANTAGES = [
  {
    icon: TrendingUp,
    number: "01",
    title: "Techno-commercial experience in Herbal industry",
    body: "14+ years of experience with a proven track record and our credibility amongst suppliers, customers and all other stake holders.",
  },
  {
    icon: BarChart3,
    number: "02",
    title: "Beyond Balance sheets",
    body: "Our deep understanding of the industry, technical and regulatory nuances mean a lot of our clientele. We go to grassroots level to find suitable herb and evaluate sustainability of a given project. This minimizes the long-term risk exposure of every strategic move.",
  },
  {
    icon: Network,
    number: "03",
    title: "Our Network, Knowledge, Understanding and Strategic Agility",
    body: "Meeting an under met medical need. Enabling you to create a complete product and/or portfolio based on our unique tailored ingredients. Making your Formulation more efficacious one and/or cost effective.",
  },
];

const CERTIFICATIONS = ["FSSAI Licensed", "Halal India", "COA per batch"];

export default function AdvantagePage() {
  return (
    <>
      <PageHero
        title="Pura Vida Advantage"
        subtitle="14+ years of experience in the herbal industry."
        image="/images/banner3.webp"
        imageAlt="Assorted botanical ingredients, herbs and essential oils"
        crumbs={[{ label: "Home", href: "/" }, { label: "Pura Vida Advantage" }]}
      />

      {/* ── Opening statement ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-emerald-50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Advantage
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
              Standardized, tested, certified
            </h2>
            <span
              aria-hidden="true"
              className="mx-auto mt-6 block h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
            />
            <p className="mt-7 text-[17px] leading-[1.9] text-gray-600">
              We offer a wide range of standardized botanical powders, prepared
              using authenticated finest quality raw herbs, processed to ensure
              the highest quality and retention of their secondary metabolites. Our dietary ingredients are 100% natural,
              tested in our in-house laboratory for compliance with international
              quality standards.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              {CERTIFICATIONS.map((cert) => (
                <span
                  key={cert}
                  className="rounded-full border border-emerald-200 bg-emerald-50/70 px-5 py-2.5 text-sm font-bold text-emerald-700"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>

          {/* Advantage blocks */}
          <div className="mt-20 space-y-6">
            {ADVANTAGES.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.number}
                  className="group grid grid-cols-1 gap-6 rounded-3xl border border-emerald-100 bg-white p-8 transition-all duration-300 hover:border-emerald/30 hover:shadow-xl hover:shadow-emerald/10 lg:grid-cols-[auto_1fr] lg:gap-10 lg:p-10"
                >
                  <div className="flex items-center gap-5 lg:flex-col lg:items-start lg:gap-4">
                    <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald shadow-lg shadow-emerald/25">
                      <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-heading text-4xl font-black text-emerald-100 transition-colors group-hover:text-emerald-200 lg:text-5xl"
                    >
                      {item.number}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading text-xl font-black leading-snug text-gray-900 sm:text-2xl">
                      {item.title}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="my-4 block h-px w-16 bg-[#D4AF37]"
                    />
                    <p className="text-[16px] leading-[1.9] text-gray-600">
                      {item.body}
                    </p>
                  </div>

                  {index === 1 && (
                    <div className="relative hidden aspect-[16/6] overflow-hidden rounded-2xl lg:col-span-2 lg:block">
                      <Image
                        src="/images/b3.webp"
                        alt="Medicinal plants sourced at grassroots level"
                        fill
                        sizes="(max-width: 1024px) 100vw, 1100px"
                        quality={82}
                        className="object-cover"
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <ImageBand
        image="/images/middile.webp"
        imageAlt="Herbal research and quality evaluation"
        quote="We go to grassroots level to find suitable herb and evaluate sustainability of a given project."
        attribution="Beyond balance sheets"
        height="md"
      />

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="bg-emerald-50/60 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-black tracking-tight text-emerald-600 sm:text-3xl">
            Make your formulation more efficacious
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            Share your requirement and our technical team will help you build a
            complete product or portfolio around it.
          </p>
          <Link
            href="/contact"
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald/20 transition-all duration-300 hover:bg-emerald-600 hover:shadow-xl"
          >
            Start a conversation
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
