"use client";

import { ShoppingCart } from "lucide-react";
import { track } from "@/lib/track";

/** "Buy on Amazon". Records the click so the Traffic page shows how many visitors the site sends to the listing. */
export function AmazonButton({ href, variant = "dark" }: { href: string; variant?: "dark" | "light" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => track("amazon_click", { product: "selvasoul-digestive-fiber-blend" })}
      className={`btn-shine group inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-xl px-7 text-base font-bold shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
        variant === "dark"
          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40"
          : "bg-white text-emerald-800 shadow-black/10 hover:shadow-xl"
      }`}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      Buy on Amazon
    </a>
  );
}
