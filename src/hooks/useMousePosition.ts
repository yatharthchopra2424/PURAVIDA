"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  velocityX: number;
  velocityY: number;
}

export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
    velocityX: 0,
    velocityY: 0,
  });
  
  const rafId = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    
    if (rafId.current) return;
    
    rafId.current = requestAnimationFrame(() => {
      setPosition((prev) => ({
        x: mousePos.current.x,
        y: mousePos.current.y,
        normalizedX: mousePos.current.x / window.innerWidth,
        normalizedY: 1.0 - mousePos.current.y / window.innerHeight,
        velocityX: mousePos.current.x - prev.x,
        velocityY: mousePos.current.y - prev.y,
      }));
      rafId.current = null;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleMouseMove]);

  return position;
}
