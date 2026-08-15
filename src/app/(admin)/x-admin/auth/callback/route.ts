import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Only same-origin relative paths are safe redirect targets.
 *
 * `new URL("//evil.com", "https://oursite.com")` resolves to
 * `https://evil.com` — protocol-relative URLs escape the origin, so a
 * leading-slash check alone is not enough. Backslashes are rejected
 * too, since some browsers normalise `/\evil.com` the same way.
 */
function safeRedirectPath(raw: string | null): string {
  const fallback = "/x-admin";
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Code exchange failed", error);
      return NextResponse.redirect(
        new URL("/x-admin/login?error=auth_failed", requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
