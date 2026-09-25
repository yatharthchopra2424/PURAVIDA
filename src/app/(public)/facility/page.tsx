import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Boxes,
  ClipboardCheck,
  Download,
  FlaskConical,
  Microscope,
  ShieldCheck,
  Sprout,
  Thermometer,
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { ImageBand } from "@/components/shared/ImageBand";
import { COMPANY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Facility & Certification",
  description:
    "Our registrations and quality process: FSSAI licence, Halal India certification, GST and Udyam numbers you can verify, and certificates of analysis on request.",
  alternates: { canonical: "/facility" },
  openGraph: {
    type: "website",
    title: "Facility & Certification | PuraVida Natural",
    description:
      "Extraction plant, analytical laboratory and quality systems — certified and audited.",
    url: "/facility",
  },
};

const CERTIFICATIONS = [
  { name: "GMP", body: "Good Manufacturing Practice." },
  { name: "FSSAI", body: "Food Safety and Standards Authority of India." },
  { name: "Halal", body: "Certified Halal product range." },
];

const FACILITIES = [
  {
    icon: FlaskConical,
    image: "/Factory_Images/herbal extraction pl.webp",
    title: "Herbal extraction plant",
    body: "Purpose-built extraction lines that capture the full bioactive profile of each botanical while retaining its secondary metabolites.",
  },
  {
    icon: Microscope,
    image: "/Factory_Images/HPLCs.jpg.webp",
    title: "In-house HPLC laboratory",
    body: "Every batch is tested in our own laboratory for compliance with international quality standards before release.",
  },
  {
    icon: Sprout,
    image: "/Factory_Images/Pure ingredient Lab .webp",
    title: "Pure ingredient handling",
    body: "Authenticated finest quality raw herbs, cleaned and processed under controlled conditions.",
  },
];

const QUALITY_STEPS = [
  {
    icon: Sprout,
    step: "01",
    title: "Raw herb authentication",
    body: "Botanical identity verified at intake, sourced through farmer-level supply networks.",
  },
  {
    icon: Thermometer,
    step: "02",
    title: "Controlled processing",
    body: "Extraction and drying parameters held within validated ranges to protect actives.",
  },
  {
    icon: Microscope,
    step: "03",
    title: "HPLC analysis",
    body: "Standardized content of actives confirmed against specification, batch by batch.",
  },
  {
    icon: ClipboardCheck,
    step: "04",
    title: "Documentation & release",
    body: "Full traceability with certificates of analysis issued for every consignment.",
  },
  {
    icon: Boxes,
    step: "05",
    title: "Packing & dispatch",
    body: "Strategic location in middle India keeps logistics simple and efficient.",
  },
];

// Licence PDFs are not published: the FSSAI annexure carries an officer's
// Aadhaar number. Buyers verify the licence on the government portal instead.
const REGISTRATIONS = [
  { label: "FSSAI Licence", value: COMPANY.fssaiLicense, verify: "https://foscos.fssai.gov.in/" },
  { label: "GSTIN", value: COMPANY.gst, verify: "https://services.gst.gov.in/services/searchtp" },
  { label: "Udyam (MSME)", value: COMPANY.udyam, verify: "https://udyamregistration.gov.in/" },
];

const DOCUMENTS = [
  { label: "Halal Product List", href: "/Product List & Certificates/PVNL - Halal Product list.pdf" },
  { label: "Product List", href: "/Product List & Certificates/Product List.pdf" },
];

export default function FacilityPage() {
  return (
    <>
      <PageHero
        title="Facility & Certification"
        subtitle="State of the art certified facilities, with every batch tested in-house."
        image="/Factory_Images/HPLCs.jpg.webp"
        imageAlt="HPLC analytical instruments in the PuraVida Natural laboratory"
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Facility & Certification" },
        ]}
      />

      {/* ── Certifications ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-16 h-[26rem] w-[26rem] rounded-full bg-emerald-50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Certification
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
              Certified, audited, documented
            </h2>
            <span
              aria-hidden="true"
              className="mx-auto mt-6 block h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
            />
            <p className="mt-7 text-[17px] leading-[1.9] text-gray-600">
              Our botanical powders and extracts are processed to ensure the
              highest quality and retention of secondary metabolites.
              Dietary ingredients are 100% natural and tested in our in-house
              laboratory for compliance with international quality standards.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CERTIFICATIONS.map((cert) => (
              <div
                key={cert.name}
                className="group rounded-2xl border border-emerald-100 bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-emerald/30 hover:shadow-lg hover:shadow-emerald/10"
              >
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                  <ShieldCheck
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                </span>
                <p className="font-heading text-sm font-bold text-gray-900">
                  {cert.name}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                  {cert.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ImageBand
        image="/Factory_Images/herbal extraction pl.webp"
        imageAlt="Herbal extraction plant in operation"
        quote="Processed to ensure highest quality and retention of its secondary metabolites."
        attribution="Our extraction standard"
        height="md"
      />

      {/* ── Facilities ─────────────────────────────────────────── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Our Facility
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
              Built for consistency
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {FACILITIES.map((item) => {
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
                      <Icon
                        className="h-5 w-5 text-emerald-600"
                        aria-hidden="true"
                      />
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

      {/* ── Quality process ────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-emerald-50/50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Quality Process
            </span>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl">
              From farm to consignment
            </h2>
          </div>

          <ol className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {QUALITY_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.step}
                  className="group relative rounded-2xl border border-emerald-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald/30 hover:shadow-lg hover:shadow-emerald/10"
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-4 top-3 font-heading text-4xl font-black text-emerald-50 transition-colors group-hover:text-emerald-100"
                  >
                    {step.step}
                  </span>
                  <span className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                    <Icon
                      className="h-5 w-5 text-emerald-600"
                      aria-hidden="true"
                    />
                  </span>
                  <h3 className="relative font-heading text-[15px] font-bold leading-snug text-gray-900">
                    {step.title}
                  </h3>
                  <p className="relative mt-2 text-[13px] leading-relaxed text-gray-600">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Documents ──────────────────────────────────────────── */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-10 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-8 lg:grid-cols-[auto_1fr] lg:p-10">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald shadow-lg shadow-emerald/25">
              <Award className="h-7 w-7 text-white" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-2xl font-black tracking-tight text-emerald-600">
                Documentation
              </h2>
              <p className="mt-2 text-base leading-relaxed text-gray-600">
                Certificates and product listings, available to download.
                Certificates of analysis are issued per consignment on request.
              </p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {REGISTRATIONS.map((r) => (
                  <div key={r.label} className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">{r.label}</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-gray-900">{r.value}</dd>
                    <a href={r.verify} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-emerald-700 hover:underline">
                      Verify on official portal →
                    </a>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                {DOCUMENTS.map((doc) => (
                  <a
                    key={doc.label}
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-300 hover:border-emerald/40 hover:shadow-md"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {doc.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="bg-emerald-50/60 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-black tracking-tight text-emerald-600 sm:text-3xl">
            Need a specification or audit document?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            We&apos;ll send the certificate of analysis, specification sheet or
            regulatory documentation you need.
          </p>
          <Link
            href="/contact"
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald/20 transition-all duration-300 hover:bg-emerald-600 hover:shadow-xl"
          >
            Request documentation
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
