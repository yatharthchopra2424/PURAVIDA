import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import {
  applyLeadFilters,
  parseLeadFilters,
  LEAD_TABLE_COLUMNS,
} from "@/lib/leads";

/** parseInt without a NaN guard turns `?page=abc` into a malformed range. */
function toPositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const filters = parseLeadFilters(searchParams);
  const page = toPositiveInt(searchParams.get("page"), 1, 10_000);
  const limit = toPositiveInt(searchParams.get("limit"), 50, 200);
  const offset = (page - 1) * limit;

  const supabase = createSupabaseServiceClient();

  const query = applyLeadFilters(
    supabase.from("leads").select(LEAD_TABLE_COLUMNS, { count: "exact" }),
    filters
  ).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
