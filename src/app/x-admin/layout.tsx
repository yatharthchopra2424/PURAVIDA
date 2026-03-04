import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? "";

  // Skip auth shell for login / auth-callback / logout routes
  const isPublicRoute =
    pathname === "/x-admin/login" ||
    pathname.startsWith("/x-admin/auth") ||
    pathname.startsWith("/x-admin/logout");

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes — verify session
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/x-admin/login");
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar userEmail={user.email ?? ""} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar — fixed within this column */}
        <div className="flex-shrink-0">
          <AdminTopbar userEmail={user.email ?? ""} />
        </div>
        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-950">
          <div className="p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
