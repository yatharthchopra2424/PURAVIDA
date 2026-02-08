import type { Metadata } from "next";
import Link from "next/link";
import {
  Leaf,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { COMPANY } from "@/lib/constants";
import { companyStats, businessProfile } from "@/data/navigation";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about PuraVida Natural — a leading manufacturer and global exporter of premium botanical extracts, essential oils, and nutraceutical ingredients since 2000.",
};

const milestones = [
  { year: "2000", title: "Founded", description: "Established with a vision to deliver world-class botanical ingredients." },
  { year: "2005", title: "ISO 9001 Certified", description: "Achieved ISO 9001:2015 quality management certification." },
  { year: "2010", title: "Global Expansion", description: "Began exporting to 40+ countries across 5 continents." },
  { year: "2018", title: "R&D Lab Launch", description: "Opened state-of-the-art phytochemistry research facility." },
  { year: "2023", title: "200+ Products", description: "Portfolio expanded to over 200 standardised botanical ingredients." },
];

export default function AboutPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-emerald">
            Home
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">About Us</span>
        </nav>

        {/* Hero */}
        <div className="mb-20">
          <SectionHeading
            title="Rooted in Nature, Driven by Science"
            subtitle="Our Story"
            description={`${COMPANY.name} is a premier manufacturer and global exporter of high-quality botanical extracts, essential oils, oleoresins, and nutraceutical ingredients. Since our founding, we've been committed to bridging traditional herbal wisdom with modern extraction science.`}
            align="left"
          />
        </div>

        {/* Stats */}
        <div className="mb-20 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {companyStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-6 text-center"
            >
              <p className="text-3xl font-bold text-emerald">
                {stat.value}
                {stat.suffix}
              </p>
              <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Mission & Vision */}
        <div className="mb-20 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="rounded-2xl bg-emerald p-8 text-white lg:p-10">
            <h3 className="mb-4 text-xl font-bold">Our Mission</h3>
            <p className="text-emerald-100 leading-relaxed">
              To deliver the finest botanical ingredients worldwide, empowering
              our partners in pharmaceuticals, nutraceuticals, food &amp;
              beverage, and cosmetics with rigorously tested, sustainably
              sourced, and competitively priced natural products.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-8 lg:p-10">
            <h3 className="mb-4 text-xl font-bold text-gray-900">
              Our Vision
            </h3>
            <p className="text-gray-600 leading-relaxed">
              To be the world&apos;s most trusted source of botanical
              innovation — setting industry benchmarks in quality, purity,
              and sustainability while advancing the science of natural
              ingredients.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <SectionHeading title="Our Journey" subtitle="Milestones" align="center" />
          <div className="mt-12 space-y-0">
            {milestones.map((m, i) => (
              <div key={m.year} className="relative flex gap-6 pb-10 last:pb-0">
                {/* Line */}
                {i < milestones.length - 1 && (
                  <div className="absolute left-[17px] top-10 h-full w-px bg-gray-200" />
                )}
                {/* Dot */}
                <div className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald text-xs font-bold text-white">
                  {m.year.slice(-2)}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                    {m.year}
                  </p>
                  <h4 className="text-lg font-bold text-gray-900">{m.title}</h4>
                  <p className="text-sm text-gray-600">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Business Profile */}
        <div className="mb-20">
          <SectionHeading
            title="Business Profile"
            subtitle="At a Glance"
            align="center"
          />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businessProfile.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald">
                  <Leaf className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Assurance */}
        <div className="mb-20 rounded-2xl bg-gray-50 p-8 lg:p-12">
          <SectionHeading
            title="Quality Assurance"
            subtitle="Certifications & Compliance"
            align="center"
          />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "ISO 9001:2015 Quality Management",
              "GMP Certified Manufacturing",
              "FSSAI Licensed (India)",
              "Halal Certified Products",
              "HACCP Compliant Processes",
              "COA with Every Shipment",
            ].map((cert) => (
              <div
                key={cert}
                className="flex items-center gap-3 rounded-xl bg-white p-4"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald" />
                <span className="text-sm font-medium text-gray-700">
                  {cert}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="mb-3 text-2xl font-bold text-gray-900">
            Ready to Partner With Us?
          </h3>
          <p className="mb-6 text-gray-600">
            Get in touch for pricing, samples, or technical documentation.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" size="lg" asChild>
              <Link href="/contact">
                Request a Quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
