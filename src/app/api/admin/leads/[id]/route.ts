import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { LEAD_STATUSES, LEAD_TAGS, LEAD_MARKETS, LEAD_TABLE_COLUMNS } from "@/lib/leads";

const LeadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    notes: z.string().max(4000).nullable().optional(),
    tags: z.array(z.enum(LEAD_TAGS)).max(8).optional(),
    is_suppressed: z.boolean().optional(),
    /** Domestic vs export — auto-classified from country, but a human override always wins. */
    market: z.enum(LEAD_MARKETS).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

/** The original source row(s) — too heavy for the list, so loaded on demand by the drawer. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const { data, error } = await createSupabaseServiceClient()
    .from("leads")
    .select("raw_data")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ raw_data: data.raw_data ?? null });
}

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

  const parsed = LeadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const patch: Record<string, unknown> = { ...parsed.data };

  // Marking a lead do-not-contact has to reach the send path, not just
  // the label in the table — the dispatcher checks `is_suppressed`.
  if (parsed.data.status === "do_not_contact") {
    patch.is_suppressed = true;
  }

  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select(LEAD_TABLE_COLUMNS)
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

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
