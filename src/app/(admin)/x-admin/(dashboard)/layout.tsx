import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { isAdminEmail } from "@/lib/admin-allowlist";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

/**
 * Authenticated admin shell.
 *
 * Login, the auth callback and logout live OUTSIDE this route group,
 * so they render without the sidebar and without an auth check — no
 * more inspecting an `x-invoke-path` header injected by middleware to
 * work out which case we are in. The router now expresses that.
 *
 * The admin panel reads live data on every request by design, so it
 * stays dynamic. Only the public site benefits from static rendering.
 */
export const dynamic = "force-dynamic";

/**
 * Unread enquiries, for the sidebar badge.
 *
 * `head: true` fetches the count without the rows. Returns 0 rather
 * than throwing: a chrome decoration must never be what takes the whole
 * admin panel down.
 */
async function getUnreadCount(): Promise<number> {
  try {
    const supabase = createSupabaseServiceClient();
    // New website quote requests; falls back to the legacy inbox until
    // scripts/website-schema.sql has been run.
    const wl = await supabase
      .from("website_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    if (!wl.error) return wl.count ?? 0;
    const { count } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/x-admin/login");
  }

  // Defence in depth: middleware already enforces this, but the layout
  // must not assume middleware ran (matcher changes, direct RSC
  // requests). A session alone is not authorisation.
  if (!isAdminEmail(user.email)) {
    redirect("/x-admin/login?error=not_authorized");
  }

  // The sidebar has always rendered an unread badge, but no caller ever
  // supplied the count, so it was permanently invisible.
  const unreadCount = await getUnreadCount();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <AdminSidebar userEmail={user.email ?? ""} unreadCount={unreadCount} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <AdminTopbar userEmail={user.email ?? ""} />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-950">
          <div className="min-h-full p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
