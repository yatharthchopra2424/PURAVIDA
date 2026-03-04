import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Admin Login — PuraVida",
  robots: "noindex, nofollow",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  // If already authenticated, go straight to dashboard
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/x-admin");
  }

  const params = await searchParams;
  const redirectTo = params.redirect || "/x-admin";

  return (
    <div className="relative min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-white font-heading font-bold text-2xl">
              PuraVida
            </span>
          </div>
          <p className="text-zinc-400 text-sm">Admin Portal</p>
        </div>

        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
