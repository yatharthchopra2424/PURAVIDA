import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { triggerDeploy } from "@/lib/deploy-hook";
import { CategoryCreateSchema, formatZodIssues } from "@/lib/validation";

export async function GET() {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("product_categories")
    .select(
      "id, name, slug, label, description, image, subcategories, example_products, product_count"
    )
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
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

  const parsed = CategoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", fields: formatZodIssues(parsed.error) },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      // products.category_id references product_categories.id, and the
      // existing rows use the slug as the id. Keep that invariant.
      id: input.slug,
      name: input.name,
      slug: input.slug,
      label: input.label || null,
      description: input.description || null,
      image: input.image || null,
      subcategories: input.subcategories ?? [],
      example_products: input.example_products ?? [],
      product_count: 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A category with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[admin/categories] insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerDeploy("category created");

  return NextResponse.json({ data }, { status: 201 });
}
