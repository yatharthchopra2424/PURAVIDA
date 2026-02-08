"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  splitBy?: "words" | "chars";
  trigger?: "mount" | "inview";
}

export function AnimatedText({
  text,
  className = "",
  delay = 0,
  stagger = 0.04,
  splitBy = "words",
  trigger = "mount",
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll(".split-unit");

    if (trigger === "mount") {
      gsap.fromTo(
        elements,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger,
          delay,
          ease: "power3.out",
        }
      );
    } else {
      // inview — use IntersectionObserver as ScrollTrigger fallback
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              gsap.fromTo(
                elements,
                { y: 40, opacity: 0 },
                {
                  y: 0,
                  opacity: 1,
                  duration: 0.6,
                  stagger,
                  delay,
                  ease: "power3.out",
                }
              );
              observer.disconnect();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [text, delay, stagger, trigger, splitBy]);

  const units = splitBy === "words" ? text.split(" ") : text.split("");

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      {units.map((unit, i) => (
        <span
          key={`${unit}-${i}`}
          className="split-unit inline-block opacity-0"
          style={{ willChange: "transform, opacity" }}
        >
          {unit}
          {splitBy === "words" && i < units.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </div>
  );
}
