"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Menu, ShoppingBag } from "lucide-react";
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
  const megaMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const useScrolledHomeWhiteLogo = isHomePage && isScrolled;

  const clearMegaMenuTimer = useCallback(() => {
    if (megaMenuCloseTimer.current) {
      clearTimeout(megaMenuCloseTimer.current);
      megaMenuCloseTimer.current = null;
    }
  }, []);

  const openMegaMenu = useCallback(() => {
    clearMegaMenuTimer();
    setMegaMenuOpen(true);
  }, [clearMegaMenuTimer]);

  const closeMegaMenu = useCallback(() => {
    clearMegaMenuTimer();
    setMegaMenuOpen(false);
  }, [clearMegaMenuTimer]);

  const scheduleMegaMenuClose = useCallback(() => {
    clearMegaMenuTimer();
    megaMenuCloseTimer.current = setTimeout(() => {
      setMegaMenuOpen(false);
      megaMenuCloseTimer.current = null;
    }, 140);
  }, [clearMegaMenuTimer]);

  useEffect(() => () => clearMegaMenuTimer(), [clearMegaMenuTimer]);

  return (
    <header className={cn(
      "transition-all duration-500 relative",
      useGreenStyle
        ? "bg-gradient-to-r from-[#2b6f2b] via-[#5a8f0c] to-[#4c7e0c] border-b border-white/10 shadow-lg"
        : useLightStyle
        ? "bg-white border-b border-gray-200 shadow-sm"
        : "bg-[rgba(6,44,29,0.72)] border-b border-white/10"
    )}>
      <div className="w-full flex items-center justify-between gap-4 px-6 sm:px-10 lg:px-14 py-[15px] lg:py-1">
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            "flex-shrink-0",
            useScrolledHomeWhiteLogo ? "my-0 ml-2" : "-my-4"
          )}
        >
          <div
            className={cn(
              "relative",
              useScrolledHomeWhiteLogo ? "h-[76px] w-56" : "h-[115px] w-80"
            )}
          >
            <Image
              src={useScrolledHomeWhiteLogo ? "/images/logo-new.png" : "/images/logo-bg-rm.png"}
              alt="Pura Vida Natural"
              fill
              sizes="192px"
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Nav + Actions grouped on the far right */}
        <div className="flex items-center gap-4">
        {/* Desktop Navigation */}
        <nav className="relative hidden items-center gap-1 lg:flex flex-shrink-0" style={{ fontFamily: "var(--font-open-sans, 'Open Sans', sans-serif)", transform: "translateZ(0)", isolation: "isolate", WebkitFontSmoothing: "subpixel-antialiased" }}>
          {navigation.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={item.children ? openMegaMenu : undefined}
              onMouseLeave={item.children ? scheduleMegaMenuClose : undefined}
            >
              {item.children ? (
                <button
                  onMouseEnter={openMegaMenu}
                  onClick={() => (megaMenuOpen ? closeMegaMenu() : openMegaMenu())}
                  className={cn(
                    "rounded-lg px-3 py-2 text-base font-normal not-italic normal-case leading-[21px] tracking-normal transition-colors whitespace-nowrap",
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
                    "rounded-lg px-3 py-2 text-base font-normal not-italic normal-case leading-[21px] tracking-normal transition-colors whitespace-nowrap",
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
            onClose={closeMegaMenu}
            onMouseEnter={openMegaMenu}
            onMouseLeave={scheduleMegaMenuClose}
          />
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search */}
          <button
            onClick={openSearch}
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-lg border px-4 text-base font-medium not-italic normal-case leading-[21px] tracking-normal transition-colors whitespace-nowrap",
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
              className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-4 text-base font-medium not-italic normal-case leading-[21px] tracking-normal text-white whitespace-nowrap transition-all hover:from-orange-600 hover:to-amber-700 shadow-md hover:shadow-lg"
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
        </div>{/* end right group */}
      </div>
    </header>
  );
}
