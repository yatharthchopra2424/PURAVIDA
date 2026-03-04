import { Package, Tag, MessageSquare, MailOpen, Activity } from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { StatsCard } from "@/components/admin/dashboard/StatsCard";
import { RecentInquiries } from "@/components/admin/dashboard/RecentInquiries";
import { TopProducts } from "@/components/admin/dashboard/TopProducts";

async function getDashboardData() {
  const supabase = createSupabaseServiceClient();

  const [
    productsRes,
    categoriesRes,
    totalInquiriesRes,
    unreadInquiriesRes,
    recentInquiriesRes,
    topProductsRes,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("product_categories")
      .select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
    supabase
      .from("contacts")
      .select("id, name, email, product, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("id, name, slug, category_id, popularity")
      .order("popularity", { ascending: false })
      .limit(5),
  ]);

  return {
    totalProducts: productsRes.count ?? 0,
    totalCategories: categoriesRes.count ?? 0,
    totalInquiries: totalInquiriesRes.count ?? 0,
    unreadInquiries: unreadInquiriesRes.count ?? 0,
    recentInquiries: recentInquiriesRes.data ?? [],
    topProducts: (topProductsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category_id,
      popularity: p.popularity ?? 0,
    })),
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">
          Dashboard
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Overview of your PuraVida catalog and inquiries
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Products"
          value={data.totalProducts}
          icon={Package}
          description="Active catalog listings"
          accentColor="emerald"
        />
        <StatsCard
          title="Categories"
          value={data.totalCategories}
          icon={Tag}
          description="Product categories"
          accentColor="blue"
        />
        <StatsCard
          title="Total Inquiries"
          value={data.totalInquiries}
          icon={MessageSquare}
          description="All time submissions"
          accentColor="purple"
        />
        <StatsCard
          title="Unread Inquiries"
          value={data.unreadInquiries}
          icon={MailOpen}
          description="Awaiting your review"
          accentColor={data.unreadInquiries > 0 ? "orange" : "emerald"}
        />
      </div>

      {/* Lower section: Recent inquiries + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentInquiries inquiries={data.recentInquiries} />
        <TopProducts products={data.topProducts} />
      </div>

      {/* Quick actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-heading font-semibold text-base mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Add Product",
              href: "/x-admin/products?action=add",
              icon: Package,
              color: "emerald",
            },
            {
              label: "Add Category",
              href: "/x-admin/categories?action=add",
              icon: Tag,
              color: "blue",
            },
            {
              label: "View Inquiries",
              href: "/x-admin/inquiries",
              icon: MessageSquare,
              color: "purple",
            },
            {
              label: "Settings",
              href: "/x-admin/settings",
              icon: Activity,
              color: "orange",
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-center transition-colors group"
              >
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-zinc-300 text-xs font-medium">
                  {action.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
