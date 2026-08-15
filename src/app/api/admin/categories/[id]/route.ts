import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { triggerDeploy } from "@/lib/deploy-hook";
import { CategoryUpdateSchema, formatZodIssues } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CategoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", fields: formatZodIssues(parsed.error) },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("product_categories")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A category with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[admin/categories/:id] update failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  await triggerDeploy("category changed");
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const supabase = createSupabaseServiceClient();

  // Refuse to orphan products. Without this the delete either fails on
  // a foreign key or silently strands every product in the category.
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    console.error("[admin/categories/:id] product count failed", countError);
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${count} product${count === 1 ? "" : "s"} still belong to this category. Reassign or delete them first.`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[admin/categories/:id] delete failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerDeploy("category changed");

  return NextResponse.json({ success: true });
}
