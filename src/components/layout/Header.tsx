"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MegaMenu } from "./MegaMenu";
import { navigation } from "@/data/navigation";
import { useSearchStore } from "@/stores/useSearchStore";
import { useUIStore } from "@/stores/useUIStore";
import { useCartStore } from "@/stores/useCartStore";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const openSearch = useSearchStore((s) => s.open);
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav);
  const cartItems = useCartStore((s) => s.items);

  const isHomePage = pathname === '/';
  
  // Check if we're on a page that should always use light navbar
  const shouldUseLightNav = pathname?.startsWith('/products') || 
                          pathname?.startsWith('/about') || 
                          pathname?.startsWith('/contact');

  useEffect(() => {
    const handleScroll = () => {
      // Consider scrolled after 80vh (out of hero section)
      setIsScrolled(window.scrollY > window.innerHeight * 0.8);
    };

    // Check initial state immediately
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Use light styling if on special pages OR scrolled out of hero on home page
  const useLightStyle = shouldUseLightNav || (isHomePage && isScrolled);
  // Use green metallic style on home page when not scrolled
  const useGreenStyle = isHomePage && !isScrolled;

  return (
    <header className={cn(
      "transition-all duration-500 relative",
      useGreenStyle
        ? "bg-gradient-to-r from-[#2b6f2b] via-[#5a8f0c] to-[#4c7e0c] border-b border-white/10 shadow-lg"
        : useLightStyle
        ? "bg-white/98 backdrop-blur-md border-b border-gray-200 shadow-sm"
        : "bg-white/20 backdrop-blur-lg border-b border-white/20"
    )}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white">
            <Image
              src="/images/logo-new.png"
              alt="Pura Vida"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <span
              className={cn(
                "text-lg font-extrabold transition-colors whitespace-nowrap",
                useLightStyle ? "tracking-[0.04em]" : "tracking-tighter"
              )}
              style={{
                color: useLightStyle ? "#5a8f0c" : "#ffffff",
                textShadow: useLightStyle ? "0 0 6px rgba(255, 255, 255, 0.95)" : "0 0 8px rgba(0, 0, 0, 0.3)"
              }}
            >
              PURAVIDA
            </span>
            <span
              className={cn(
                "ml-1.5 text-lg font-extrabold uppercase transition-colors whitespace-nowrap",
                useLightStyle ? "tracking-[0.04em]" : "tracking-tighter"
              )}
              style={{
                color: useLightStyle ? "#5a8f0c" : "#ffffff",
                textShadow: useLightStyle ? "0 0 6px rgba(255, 255, 255, 0.95)" : "0 0 8px rgba(0, 0, 0, 0.3)"
              }}
            >
              NATURAL
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="relative hidden items-center gap-0.5 lg:flex flex-shrink-0">
          {navigation.map((item) => (
            <div key={item.label} className="relative">
              {item.children ? (
                <button
                  onMouseEnter={() => setMegaMenuOpen(true)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap",
                    megaMenuOpen
                      ? useLightStyle ? "bg-amber-50 text-amber-600" : "bg-white/20 text-white"
                      : useLightStyle 
                        ? "text-gray-700 hover:bg-gray-100 hover:text-amber-600"
                        : "text-white hover:bg-white/20 hover:text-white"
                  )}
                >
                  {item.label}
                  <svg
                    className={cn(
                      "ml-1 inline-block h-3 w-3 transition-transform",
                      megaMenuOpen && "rotate-180"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap",
                    useLightStyle
                      ? "text-gray-700 hover:bg-gray-100 hover:text-amber-600"
                      : "text-white hover:bg-white/20 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}

          {/* Mega Menu Dropdown */}
          <MegaMenu
            isOpen={megaMenuOpen}
            onClose={() => setMegaMenuOpen(false)}
          />
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search */}
          <button
            onClick={openSearch}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors whitespace-nowrap",
              useLightStyle
                ? "border-gray-300 text-gray-600 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50"
                : "border-white/30 text-white hover:border-white/50 hover:text-white hover:bg-white/10"
            )}
            title="Search products (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Search...</span>
            <kbd className={cn(
              "hidden rounded px-1 py-0.5 text-[10px] font-medium xl:inline",
              useLightStyle ? "bg-gray-100 text-gray-500" : "bg-white/20 text-white/80"
            )}>
              ⌘K
            </kbd>
          </button>

          {/* Quote Cart */}
          {cartItems.length > 0 && (
            <Link
              href="/contact"
              className={cn(
                "relative rounded-lg p-1.5 transition-colors",
                useLightStyle
                  ? "text-gray-700 hover:bg-gray-100 hover:text-amber-600"
                  : "text-white hover:bg-white/20 hover:text-white"
              )}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {cartItems.length}
              </span>
            </Link>
          )}

          {/* Send Inquiry CTA */}
          <div className="hidden lg:flex">
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center px-4 py-1.5 text-[13px] font-semibold rounded-lg text-white whitespace-nowrap transition-all bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md hover:shadow-lg"
            >
              Send Inquiry
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMobileNav}
            className={cn(
              "rounded-lg p-1.5 transition-colors lg:hidden",
              useLightStyle
                ? "text-gray-700 hover:bg-gray-100"
                : "text-white hover:bg-white/20"
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
