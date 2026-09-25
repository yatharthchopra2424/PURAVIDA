"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Card with a soft glow that follows the pointer (the "spotlight card"
 * pattern from Aceternity / Magic UI). The pointer position is written to
 * CSS variables directly, so moving the mouse never re-renders React.
 * Touch devices and reduced-motion users simply get the plain card.
 */
export function SpotlightCard({
  children,
  className,
  glow = "rgba(90, 143, 12, 0.14)",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        ref.current!.style.setProperty("--sx", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
      className={cn("spotlight-card group/spot relative", className)}
      style={{ ...style, ["--spot" as string]: glow }}
    >
      <div
        aria-hidden="true"
        className="spotlight-glow pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
