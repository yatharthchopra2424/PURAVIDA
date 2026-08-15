import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { triggerDeploy } from "@/lib/deploy-hook";
import { ProductCreateSchema, formatZodIssues } from "@/lib/validation";

/** parseInt without a NaN guard turned `?page=abc` into a malformed range query. */
function toPositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = toPositiveInt(searchParams.get("page"), 1, 10_000);
  const limit = toPositiveInt(searchParams.get("limit"), 25, 100);
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
    // Escape PostgREST LIKE wildcards so a literal % or _ in the search
    // box doesn't silently match everything.
    const escaped = search.replace(/[%_\\]/g, (char) => `\\${char}`);
    query = query.ilike("name", `%${escaped}%`);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", fields: formatZodIssues(parsed.error) },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug: input.slug,
      category_id: input.category_id,
      botanical_name: input.botanical_name || null,
      active_ingredient: input.active_ingredient || null,
      active_compound: input.active_compound || null,
      concentration: input.concentration || null,
      applications: input.applications ?? [],
      description: input.description || null,
      image_path: input.image_path || null,
      quality_badges: input.quality_badges ?? [],
      is_halal: input.is_halal ?? false,
      popularity: input.popularity ?? 50,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A product with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[admin/products] insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerDeploy("product created");

  return NextResponse.json({ data }, { status: 201 });
}
