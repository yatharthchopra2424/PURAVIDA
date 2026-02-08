"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { companyStats } from "@/data/navigation";

export function StatsStrip() {
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate number counters
            const counters =
              statsRef.current?.querySelectorAll(".stat-value") || [];
            counters.forEach((counter) => {
              const target = parseInt(
                counter.getAttribute("data-value") || "0",
                10
              );
              if (isNaN(target)) return;
              gsap.fromTo(
                counter,
                { innerText: "0" },
                {
                  innerText: target,
                  duration: 2,
                  ease: "power2.out",
                  snap: { innerText: 1 },
                }
              );
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={statsRef}
      className="border-t border-white/10 bg-black/20 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center divide-x divide-white/10 px-4 py-5 sm:px-6">
        {companyStats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center px-4 sm:px-8 md:px-12"
          >
            <div className="flex items-baseline gap-0.5">
              <span
                className="stat-value text-2xl font-bold text-white sm:text-3xl"
                data-value={stat.value.replace(/\D/g, "")}
              >
                {stat.value.replace(/\D/g, "") || stat.value}
              </span>
              {stat.suffix && (
                <span className="text-lg font-semibold text-orange-400">
                  {stat.suffix}
                </span>
              )}
            </div>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-gray-400 sm:text-xs">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
