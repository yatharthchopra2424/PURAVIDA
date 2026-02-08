"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Building2, Users, Calendar, Scale, TrendingUp, FileText, Award } from "lucide-react";
import { businessProfile } from "@/data/navigation";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/shared/SectionHeading";

const profileIcons: Record<string, React.ReactNode> = {
  "Nature of Business": <Building2 className="h-4 w-4" />,
  "Employee Range": <Users className="h-4 w-4" />,
  "Year of Establishment": <Calendar className="h-4 w-4" />,
  "Legal Status": <Scale className="h-4 w-4" />,
  "Annual Turnover": <TrendingUp className="h-4 w-4" />,
  "Import-Export Code": <FileText className="h-4 w-4" />,
  "GST Number": <FileText className="h-4 w-4" />,
  "ISO Certification": <Award className="h-4 w-4" />,
};

export function CompanyInfo() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Left: Prose */}
          <div>
            <SectionHeading
              subtitle="About Our Company"
              title="Your Trusted Partner in Natural Health"
              align="left"
            />
            <div className="mt-6 space-y-4 text-gray-600">
              <p className="leading-relaxed">
                PuraVida Natural is a leading manufacturer and global supplier of
                premium health products, natural supplements, herbal extracts,
                essential oils, and botanical ingredients. Based in New Delhi,
                India, we serve partners across 50+ countries with unwavering
                commitment to quality.
              </p>
              <p className="leading-relaxed">
                Our values are rooted in quality, responsibility, consistency, and
                service. Every product that leaves our facility carries the
                assurance of ISO 9001:2015 certification, GMP compliance, and
                FSSAI registration.
              </p>
            </div>
            <div className="mt-8">
              <Button variant="outline" size="md" asChild>
                <Link href="/about">
                  Learn More About Us
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Business Profile Grid */}
          <div>
            <div className="grid grid-cols-2 gap-3">
              {businessProfile.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-emerald/20 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-emerald">
                    {profileIcons[item.label] || <FileText className="h-4 w-4" />}
                    <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA Card */}
            <div className="mt-4 rounded-xl bg-gradient-to-r from-emerald to-emerald-800 p-6">
              <h4 className="mb-2 text-lg font-bold text-white">
                Bulk Orders? Get the Best Deal
              </h4>
              <p className="mb-4 text-sm text-emerald-200">
                Contact our sales team for competitive pricing on bulk quantities
                and custom formulations.
              </p>
              <Button variant="primary" size="sm" asChild>
                <Link href="/contact">
                  Request Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
