"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Leaf,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/x-admin", icon: LayoutDashboard },
  { label: "Products", href: "/x-admin/products", icon: Package },
  { label: "Categories", href: "/x-admin/categories", icon: Tag },
  { label: "Inquiries", href: "/x-admin/inquiries", icon: MessageSquare },
  { label: "Settings", href: "/x-admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  userEmail: string;
  unreadCount?: number;
}

export default function AdminSidebar({
  userEmail,
  unreadCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push("/x-admin/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/x-admin") return pathname === "/x-admin";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`
        relative flex flex-col bg-zinc-900 border-r border-zinc-800
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? "w-16" : "w-60"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800 h-16">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-heading font-bold text-lg tracking-tight truncate">
            PuraVida
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const showBadge = item.href === "/x-admin/inquiries" && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                transition-all duration-150 relative
                ${
                  active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent"
                }
              `}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
              />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {showBadge && !collapsed && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {showBadge && collapsed && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign Out */}
      <div className="border-t border-zinc-800 px-2 py-3 space-y-1">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-zinc-500 text-xs truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          title={collapsed ? "Sign Out" : undefined}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{isSigningOut ? "Signing out…" : "Sign Out"}</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
