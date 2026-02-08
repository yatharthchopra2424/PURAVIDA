import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Download,
  Shield,
  Award,
} from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { fetchCategories } from "@/lib/catalog";

export async function Footer() {
  const currentYear = new Date().getFullYear();
  const categories = await fetchCategories();

  return (
    <footer className="border-t border-emerald-700 bg-emerald text-emerald-50">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative h-9 w-9 overflow-hidden rounded-lg bg-white">
                <Image
                  src="/images/logo-new.png"
                  alt="Pura Vida"
                  fill
                  sizes="36px"
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-lg font-bold text-white">Pura</span>
                <span className="text-lg font-bold text-orange-400">Vida</span>
              </div>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-emerald-100">
              Premium manufacturer and global supplier of natural health
              products, botanical ingredients, herbal extracts, essential oils,
              and nutraceutical ingredients since {COMPANY.established}.
            </p>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-800 px-2 py-1 text-[10px] font-medium text-white">
                <Shield className="h-3 w-3" /> ISO 9001:2015
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-800 px-2 py-1 text-[10px] font-medium text-white">
                <Award className="h-3 w-3" /> GMP
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Home", href: "/" },
                { label: "About Us", href: "/about" },
                { label: "Our Products", href: "/products" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-emerald-100 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 text-sm text-orange-300 transition-colors hover:text-orange-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Catalog
                </a>
              </li>
            </ul>
          </div>

          {/* Product Categories */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Products
            </h4>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/products/${cat.slug}`}
                    className="text-sm text-emerald-100 transition-colors hover:text-white"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-300" />
                <span className="text-sm">{COMPANY.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 flex-shrink-0 text-orange-300" />
                <a
                  href={`tel:${COMPANY.phone}`}
                  className="text-sm transition-colors hover:text-white"
                >
                  {COMPANY.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 flex-shrink-0 text-orange-300" />
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-sm transition-colors hover:text-white"
                >
                  {COMPANY.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 flex-shrink-0 text-orange-300" />
                <span className="text-sm">{COMPANY.hours}</span>
              </li>
            </ul>

            {/* Legal */}
            <div className="mt-4 space-y-1 rounded-lg bg-emerald-800/50 p-3">
              <p className="text-[11px] text-emerald-200">
                GST: {COMPANY.gst}
              </p>
              <p className="text-[11px] text-emerald-200">
                IEC: {COMPANY.iec}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-emerald-700">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-emerald-200 sm:flex-row sm:px-6">
          <p>&copy; {currentYear} {COMPANY.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Export Quality Certified</span>
            <span className="text-emerald-400">|</span>
            <span>Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
