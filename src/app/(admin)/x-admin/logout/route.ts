import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { absoluteUrl } from "@/lib/site";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Uses the shared origin resolver so logout also lands correctly on
  // Vercel preview deployments, not just localhost and production.
  return NextResponse.redirect(absoluteUrl("/x-admin/login"), {
    // 303 forces the follow-up request to be a GET. Without it the
    // browser may re-issue POST against the login page.
    status: 303,
  });
}
