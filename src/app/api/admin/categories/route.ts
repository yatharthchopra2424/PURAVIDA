import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

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

  const body = await req.json();
  const { name, slug, label, description, image, subcategories, example_products } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      name,
      slug,
      label: label || null,
      description: description || null,
      image: image || null,
      subcategories: subcategories || [],
      example_products: example_products || [],
      product_count: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
