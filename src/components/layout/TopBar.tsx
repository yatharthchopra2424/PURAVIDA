"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Phone, Mail } from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > window.innerHeight * 0.8);
    };

    handleScroll(); // Check initial state
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={cn(
      "transition-all duration-500 z-50 relative overflow-hidden",
      isScrolled
        ? "bg-emerald text-white max-h-20 opacity-100"
        : "bg-emerald/98 backdrop-blur-md text-white max-h-0 opacity-0"
    )}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {COMPANY.address}
          </span>
          <span className="hidden text-emerald-300 sm:inline">|</span>
          <span className="hidden sm:inline">GST No.- {COMPANY.gst}</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`tel:${COMPANY.phone}`}
            className="flex items-center gap-1.5 transition-colors hover:text-emerald-200"
          >
            <Phone className="h-3 w-3" />
            <span className="hidden sm:inline">{COMPANY.phone}</span>
          </a>
          <a
            href={`mailto:${COMPANY.email}`}
            className="flex items-center gap-1.5 transition-colors hover:text-emerald-200"
          >
            <Mail className="h-3 w-3" />
            <span className="hidden sm:inline">{COMPANY.email}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
