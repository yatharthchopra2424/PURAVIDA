"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import Link from "next/link"; // Correct import for Link

export const HeroOverlay = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            tl.from(titleRef.current, {
                y: 100,
                opacity: 0,
                duration: 1.2,
                delay: 0.5,
            })
                .from(subtitleRef.current, {
                    y: 50,
                    opacity: 0,
                    duration: 1,
                }, "-=0.8")
                .from(ctaRef.current, {
                    y: 30,
                    opacity: 0,
                    duration: 0.8,
                }, "-=0.6");

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="relative z-10 h-screen flex flex-col justify-center items-center px-6 max-w-7xl mx-auto pointer-events-none text-center">
            <div className="max-w-6xl pointer-events-auto">
                <h1 
                    ref={titleRef} 
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.15] mb-6 text-white"
                    style={{ WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility', fontFamily: 'var(--font-space-grotesk)' }}
                >
                    CURED BY NATURE. PERFECTED BY SCIENCE.
                </h1>

                <p ref={subtitleRef} className="text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-8 text-white/90" style={{ letterSpacing: '0.02em' }}>
                    Pure, standardized extracts that capture the healing power of plants.
                </p>

                <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-4">
                    <Link
                        href="/products"
                        className="gold-button group relative px-8 py-4 text-base font-semibold rounded-lg overflow-hidden transition-all active:scale-95"
                    >
                        <span className="relative z-10 flex items-center gap-2 tracking-widest">
                            Discover Our Extracts
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </span>
                    </Link>
                </div>
            </div>

        </div>
    );
};
