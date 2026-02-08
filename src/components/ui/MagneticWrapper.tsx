"use client";

import React from "react";
import { useMagneticHover } from "@/hooks/useMagneticHover";

interface MagneticWrapperProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}

export function MagneticWrapper({
  children,
  strength = 0.3,
  className,
}: MagneticWrapperProps) {
  const ref = useMagneticHover<HTMLDivElement>({ strength });

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
