import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin-allowlist";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove this getUser() call
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // A session proves identity; the allowlist grants authorisation.
  // Without this, any self-registered Supabase account would be admin.
  const isAdmin = Boolean(user) && isAdminEmail(user?.email);

  const isLoginRoute = pathname.startsWith("/x-admin/login");
  const isAuthRoute = pathname.startsWith("/x-admin/auth");
  const isLogoutRoute = pathname.startsWith("/x-admin/logout");

  // Guard all /x-admin routes except login, auth callback and logout
  if (
    pathname.startsWith("/x-admin") &&
    !isLoginRoute &&
    !isAuthRoute &&
    !isLogoutRoute
  ) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/x-admin/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdmin) {
      // Signed in with a non-allowlisted account. Send them to login
      // with an explicit reason rather than a bare redirect, so this
      // reads as "not permitted" instead of "not signed in".
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/x-admin/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(loginUrl);
    }
  }

  // If an ADMIN visits the login page, send them to the dashboard.
  // Gated on isAdmin (not merely `user`) — otherwise a signed-in
  // non-admin would bounce login → /x-admin → login forever.
  if (isLoginRoute && isAdmin) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/x-admin";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  // Scoped to /x-admin only.
  //
  // This previously matched nearly every request, performing a network
  // getUser() call to Supabase on every public page view and API call —
  // added latency and burned auth quota for routes with no concept of a
  // session. The `x-invoke-path` header it used to inject is no longer
  // needed either: route groups now decide which chrome renders.
  //
  // Public pages can therefore be served straight from the CDN.
  matcher: ["/x-admin/:path*"],
};
