"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";

export function AboutSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <SectionHeading
            subtitle="Our Story"
            title="Pura Vida: The Essence of Pure Life."
          />
          <div className="mt-8 space-y-4 text-gray-600">
            <p className="text-lg leading-relaxed">
              Rooted in the ancient wisdom of Indian Ayurveda and powered by
              modern scientific processes, PuraVida Natural has built a global
              reputation for excellence in botanical ingredients. We source the
              finest herbs, spices, and botanicals from the resource-rich regions
              of India, working cooperatively with farmers and communities who
              share our commitment to sustainability.
            </p>
            <p className="text-lg leading-relaxed">
              Our extraction facilities span across key botanical regions,
              ensuring the shortest path from harvest to processing. This
              cooperative manufacturing model allows us to capture peak
              bio-activity while maintaining full traceability and ethical
              sourcing standards. We believe in building lawful, ethical, and
              long-term partnerships with every stakeholder in our value chain.
            </p>
          </div>
          {/* Matched to the other section CTAs: same size, weight,
              hover lift and arrow nudge, so the page reads as one
              system rather than three different button styles. */}
          <div className="mt-12">
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2"
            >
              Learn More About Us
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
