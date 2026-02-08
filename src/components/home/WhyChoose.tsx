"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { Award, Leaf, FlaskConical, Globe, ShieldCheck, Headset } from "lucide-react";
import { whyChooseFeatures } from "@/data/navigation";
import { MagneticWrapper } from "@/components/ui/MagneticWrapper";

const iconMap: Record<string, React.ReactNode> = {
  award: <Award className="h-6 w-6" />,
  leaf: <Leaf className="h-6 w-6" />,
  flask: <FlaskConical className="h-6 w-6" />,
  globe: <Globe className="h-6 w-6" />,
  "shield-check": <ShieldCheck className="h-6 w-6" />,
  headset: <Headset className="h-6 w-6" />,
};

export function WhyChoose() {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll(".feature-card");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              cards,
              { y: 40, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: "power3.out",
                force3D: true,
                onComplete: () => {
                  cards.forEach((card) => {
                    (card as HTMLElement).style.willChange = "auto";
                  });
                },
              }
            );
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    observer.observe(cardsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-extrabold uppercase tracking-widest text-orange-500">
            Why Choose PuraVida
          </span>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-emerald-600">
            More Than a Supplier—A Strategic Partner.
          </h2>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            We Go to the Grassroots so You Reach the Global Standard.
          </p>
        </div>

        <div ref={cardsRef} className="mt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center md:justify-items-stretch">
            {whyChooseFeatures.map((feature) => (
              <MagneticWrapper
                key={feature.title}
                strength={0.15}
                className="w-full max-w-[350px] md:max-w-none"
              >
                <div
                  className="feature-card group cursor-pointer rounded-[25px] border-2 bg-white p-8 opacity-0 transition-all duration-300 hover:-translate-y-2 h-full"
                  style={{ 
                    willChange: "transform, opacity",
                    borderColor: '#a8c49a',
                    boxShadow: '0 15px 30px rgba(168, 196, 154, 0.4)'
                  }}
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-50 text-emerald transition-colors group-hover:bg-emerald group-hover:text-white mx-auto">
                    {iconMap[feature.icon]}
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-center" style={{ color: '#cfa153' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-center" style={{ color: '#555555' }}>
                    {feature.description}
                  </p>
                </div>
              </MagneticWrapper>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
