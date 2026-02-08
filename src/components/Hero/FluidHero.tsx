"use client";

import React from "react";
import { FluidBackground } from "./FluidBackground";
import { HeroOverlay } from "./HeroOverlay";

export function FluidHero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Fluid Background with Image */}
      <FluidBackground />
      
      {/* Hero Content Overlay */}
      <HeroOverlay />
    </section>
  );
}
