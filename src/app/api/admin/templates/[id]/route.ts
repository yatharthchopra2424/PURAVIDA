import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { sanitizeEmailHtml } from "@/lib/campaign-render";
import { TEMPLATE_COLUMNS, TemplateSchema } from "@/lib/templates";

/** Overwrites a saved email — used when "Save" is pressed again on one. */
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

  const parsed = TemplateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const patch: Record<string, string> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.subject !== undefined) patch.subject = parsed.data.subject;
  if (parsed.data.bodyHtml !== undefined) {
    patch.body_html = sanitizeEmailHtml(parsed.data.bodyHtml);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .update(patch)
    .eq("id", id)
    .select(TEMPLATE_COLUMNS)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
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
  const { error } = await supabase.from("email_templates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
