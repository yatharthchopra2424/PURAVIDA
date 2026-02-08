"use client";

import { useEffect, useCallback, useRef } from "react";
import gsap from "gsap";

interface MagneticOptions {
  strength?: number;
  ease?: string;
  duration?: number;
}

export function useMagneticHover<T extends HTMLElement>(
  options: MagneticOptions = {}
) {
  const { strength = 0.3, ease = "power2.out", duration = 0.3 } = options;
  const ref = useRef<T>(null);
  const rafId = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current) return;
      
      // Cancel previous RAF
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      
      rafId.current = requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * strength;
        const deltaY = (e.clientY - centerY) * strength;

        gsap.to(ref.current, {
          x: deltaX,
          y: deltaY,
          duration,
          ease,
          force3D: true,
        });
      });
    },
    [strength, ease, duration]
  );

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.5)",
      force3D: true,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener("mousemove", handleMouseMove, { passive: true });
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return ref;
}
