"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  useEffect(() => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.on("scroll", ScrollTrigger.update);
    }
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        lerp: 0.08,
        duration: 1.2,
        smoothWheel: true,
        autoRaf: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
