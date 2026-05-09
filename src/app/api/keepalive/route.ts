import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    
    // A tiny query to ensure the database actually wakes up
    const { data, error } = await supabase.from("products").select("id").limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: String(err),
      },
      { status: 500 }
    );
  }
}