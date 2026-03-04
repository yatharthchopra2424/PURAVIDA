"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface AdminTopbarProps {
  userEmail: string;
}

const BREADCRUMB_MAP: Record<string, string> = {
  "/x-admin": "Dashboard",
  "/x-admin/products": "Products",
  "/x-admin/categories": "Categories",
  "/x-admin/inquiries": "Inquiries",
  "/x-admin/settings": "Settings",
};

export default function AdminTopbar({ userEmail }: AdminTopbarProps) {
  const pathname = usePathname();

  // Build breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.reduce<{ label: string; href: string }[]>(
    (acc, seg, idx) => {
      const href = "/" + segments.slice(0, idx + 1).join("/");
      const label =
        BREADCRUMB_MAP[href] ||
        seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
      acc.push({ label, href });
      return acc;
    },
    []
  );

  return (
    <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span
              className={
                idx === breadcrumbs.length - 1
                  ? "text-zinc-100 font-medium"
                  : "text-zinc-500"
              }
            >
              {crumb.label}
            </span>
          </div>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
          <span className="text-emerald-400 font-bold text-sm">
            {userEmail.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-zinc-400 text-sm hidden md:block max-w-[200px] truncate">
          {userEmail}
        </span>
      </div>
    </header>
  );
}
