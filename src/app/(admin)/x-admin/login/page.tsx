import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { needsSecondFactor } from "@/lib/admin-mfa";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Admin Login — PuraVida",
  robots: "noindex, nofollow",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  // Only bounce to the dashboard for an ALLOWLISTED user. Gating on
  // `user` alone would loop a signed-in non-admin between this page
  // and /x-admin forever.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const owesMfa = Boolean(user && isAdminEmail(user.email)) && (await needsSecondFactor(supabase));
  if (user && isAdminEmail(user.email) && !owesMfa) {
    redirect("/x-admin");
  }

  const params = await searchParams;

  // Only allow same-origin relative paths. `//evil.com` is a valid URL
  // that resolves off-origin, so a leading-slash check alone is not
  // enough to prevent an open redirect.
  const rawRedirect = params.redirect ?? "/x-admin";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/x-admin";

  const notAuthorized = params.error === "not_authorized";

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

        {notAuthorized && (
          <div
            role="alert"
            className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-amber-300 text-sm font-medium">
                  This account is not authorized
                </p>
                {/* Naming the account is the whole diagnosis: the usual
                    cause is signing in with a different address from the
                    one in ADMIN_EMAILS, and without this the two look
                    identical from the outside. */}
                {user?.email ? (
                  <p className="text-amber-400/70 text-xs mt-0.5 break-all">
                    You are signed in as <strong>{user.email}</strong>, which is
                    not on the admin list. Sign out and use an authorized
                    account, or add this address to ADMIN_EMAILS.
                  </p>
                ) : (
                  <p className="text-amber-400/70 text-xs mt-0.5">
                    You are signed in, but this email does not have admin
                    access. Sign in with an authorized account.
                  </p>
                )}
              </div>
            </div>

            {/* Without this the page is a dead end: the form below just
                re-authenticates the same unauthorized session. */}
            {user && (
              <form action="/x-admin/logout" method="post" className="mt-3 pl-7">
                <button
                  type="submit"
                  className="text-xs font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200"
                >
                  Sign out
                </button>
              </form>
            )}
          </div>
        )}

        <LoginForm redirectTo={redirectTo} startAtMfa={owesMfa} />
      </div>
    </div>
  );
}
