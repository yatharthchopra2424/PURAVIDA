import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "25");
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";

  const offset = (page - 1) * limit;

  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("products")
    .select(
      "id, name, slug, category_id, botanical_name, active_ingredient, active_compound, concentration, applications, description, image_path, quality_badges, is_halal, popularity, product_categories(name, slug)",
      { count: "exact" }
    )
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (category) {
    query = query.eq("category_id", category);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const {
    name,
    slug,
    category_id,
    botanical_name,
    active_ingredient,
    active_compound,
    concentration,
    applications,
    description,
    image_path,
    quality_badges,
    is_halal,
    popularity,
  } = body;

  if (!name || !slug || !category_id) {
    return NextResponse.json(
      { error: "name, slug, and category_id are required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      category_id,
      botanical_name: botanical_name || null,
      active_ingredient: active_ingredient || null,
      active_compound: active_compound || null,
      concentration: concentration || null,
      applications: applications || [],
      description: description || null,
      image_path: image_path || null,
      quality_badges: quality_badges || [],
      is_halal: is_halal ?? false,
      popularity: popularity ?? 50,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
