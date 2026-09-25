"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/** Records one anonymous page view per route change (see src/lib/track.ts). */
export function PageviewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("pageview");
  }, [pathname]);
  return null;
}
