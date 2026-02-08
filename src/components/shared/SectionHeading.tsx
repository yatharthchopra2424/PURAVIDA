"use client";

import React from "react";
import { AnimatedText } from "./AnimatedText";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  light?: boolean;
}

export function SectionHeading({
  title,
  subtitle,
  description,
  align = "center",
  className,
  light = false,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {subtitle && (
        <span
          className={cn(
            "mb-3 inline-block text-xs font-extrabold uppercase tracking-widest",
            light ? "text-emerald-300" : "text-orange-500"
          )}
        >
          {subtitle}
        </span>
      )}
      <AnimatedText
        text={title}
        className={cn(
          "text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl",
          light ? "text-white" : "text-emerald-600"
        )}
        trigger="inview"
        splitBy="words"
      />
      {description && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            light ? "text-gray-300" : "text-gray-600"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
