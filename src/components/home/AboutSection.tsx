"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
          <div className="mt-10">
            <Button variant="secondary" size="lg" asChild>
              <Link href="/about">
                Learn More About Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
