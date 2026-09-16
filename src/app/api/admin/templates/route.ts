import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { sanitizeEmailHtml } from "@/lib/campaign-render";
import { TEMPLATE_COLUMNS, TemplateSchema } from "@/lib/templates";

export async function GET() {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select(TEMPLATE_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
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

  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Give the email a name before saving it.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      name: parsed.data.name,
      subject: parsed.data.subject,
      // Sanitised on the way in, like campaign bodies, so a saved email
      // can never carry markup that sending would have to strip later.
      body_html: sanitizeEmailHtml(parsed.data.bodyHtml),
      created_by: auth.user.email ?? null,
    })
    .select(TEMPLATE_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
