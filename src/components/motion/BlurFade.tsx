"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Fades, un-blurs and lifts its children into place the first time they
 * scroll into view (the "Blur Fade" pattern). Opacity, blur and transform
 * only, so it never causes layout shift; reduced-motion users see the
 * content immediately.
 */
export function BlurFade({
  children,
  delay = 0,
  className,
  y = 14,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
