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

  // Check if we're on a page that should always use dark navbar
  const shouldUseDarkNav = pathname?.startsWith('/products') || 
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

  // Use dark styling if on special pages OR scrolled
  const useDarkStyle = shouldUseDarkNav || isScrolled;

  return (
    <header className={cn(
      "transition-all duration-500 relative",
      useDarkStyle
        ? "bg-white/98 backdrop-blur-md border-b border-gray-200 shadow-sm"
        : "bg-white/20 backdrop-blur-lg border-b border-white/20"
    )}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white">
            <Image
              src="/images/logo-new.png"
              alt="Pura Vida"
              fill
              sizes="48px"
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <span
              className={cn(
                "text-2xl font-extrabold transition-colors",
                useDarkStyle ? "tracking-[0.04em]" : "tracking-tighter"
              )}
              style={{
                color: useDarkStyle ? "#5a8f0c" : "#ffffff",
                textShadow: useDarkStyle ? "0 0 6px rgba(255, 255, 255, 0.95)" : "0 0 8px rgba(0, 0, 0, 0.3)"
              }}
            >
              PURAVIDA
            </span>
            <span
              className={cn(
                "ml-2 text-2xl font-extrabold uppercase transition-colors",
                useDarkStyle ? "tracking-[0.04em]" : "tracking-tighter"
              )}
              style={{
                color: useDarkStyle ? "#5a8f0c" : "#ffffff",
                textShadow: useDarkStyle ? "0 0 6px rgba(255, 255, 255, 0.95)" : "0 0 8px rgba(0, 0, 0, 0.3)"
              }}
            >
              NATURAL
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="relative hidden items-center gap-1 lg:flex">
          {navigation.map((item) => (
            <div key={item.label} className="relative">
              {item.children ? (
                <button
                  onMouseEnter={() => setMegaMenuOpen(true)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
                    megaMenuOpen
                      ? useDarkStyle ? "bg-amber-50 text-amber-600" : "bg-amber-500/20 text-amber-300"
                      : useDarkStyle 
                        ? "text-gray-700 hover:bg-gray-100 hover:text-amber-600"
                        : "text-white hover:bg-white/10 hover:text-amber-300"
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
                    "rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
                    useDarkStyle
                      ? "text-gray-700 hover:bg-gray-100 hover:text-amber-600"
                      : "text-white hover:bg-white/10 hover:text-amber-300"
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
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={openSearch}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-[15px] transition-colors",
              useDarkStyle
                ? "border-gray-300 text-gray-600 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50"
                : "border-white/20 text-white/70 hover:border-amber-400 hover:text-amber-300 hover:bg-white/5"
            )}
            title="Search products (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search...</span>
            <kbd className={cn(
              "hidden rounded px-1.5 py-0.5 text-[10px] font-medium md:inline",
              useDarkStyle ? "bg-gray-100 text-gray-500" : "bg-white/10 text-white/60"
            )}>
              ⌘K
            </kbd>
          </button>

          {/* Quote Cart */}
          {cartItems.length > 0 && (
            <Link
              href="/contact"
              className={cn(
                "relative rounded-lg p-2 transition-colors",
                useDarkStyle
                  ? "text-gray-700 hover:bg-gray-100 hover:text-amber-600"
                  : "text-white hover:bg-white/10 hover:text-amber-300"
              )}
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {cartItems.length}
              </span>
            </Link>
          )}

          {/* Send Inquiry CTA */}
          <div className="hidden sm:flex">
            <Button variant="primary" size="sm" asChild className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 border-none text-white">
              <Link href="/contact">Send Inquiry</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMobileNav}
            className={cn(
              "rounded-lg p-2 transition-colors lg:hidden",
              useDarkStyle
                ? "text-gray-700 hover:bg-gray-100"
                : "text-white hover:bg-white/10"
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
