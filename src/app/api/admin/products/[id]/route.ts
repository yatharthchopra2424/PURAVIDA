import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { triggerDeploy } from "@/lib/deploy-hook";
import { ProductUpdateSchema, formatZodIssues } from "@/lib/validation";

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

  // Previously `.update(body)` with the raw payload — every column was
  // writable, including `id`.
  const parsed = ProductUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", fields: formatZodIssues(parsed.error) },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation (duplicate slug is the common case)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A product with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[admin/products/:id] update failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await triggerDeploy("product changed");
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

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("[admin/products/:id] delete failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerDeploy("product changed");

  return NextResponse.json({ success: true });
}
