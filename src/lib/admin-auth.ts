import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-allowlist";

export { getAdminEmails, isAdminEmail } from "@/lib/admin-allowlist";

/**
 * Verifies the request carries a valid Supabase session belonging to an
 * allowlisted admin.
 *
 * Returns the user, or a NextResponse to return directly:
 *   401 — not signed in
 *   403 — signed in, but not an admin
 *
 * Usage in API route handlers:
 *   const result = await requireAdminUser();
 *   if (result instanceof NextResponse) return result;
 *   const { user } = result;
 */
export async function requireAdminUser(): Promise<
  { user: { id: string; email?: string } } | NextResponse
> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context — safe to ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminEmail(user.email)) {
    console.warn(
      `[admin-auth] Rejected non-admin account: ${user.email ?? user.id}`
    );
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user };
}
