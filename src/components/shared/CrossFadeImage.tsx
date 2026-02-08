"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

interface CrossFadeImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

export function CrossFadeImage({
  src,
  alt,
  className = "",
  fill = true,
  width,
  height,
}: CrossFadeImageProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={src}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`relative ${className}`}
      >
        {fill ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width || 400}
            height={height || 300}
            className="object-cover"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
