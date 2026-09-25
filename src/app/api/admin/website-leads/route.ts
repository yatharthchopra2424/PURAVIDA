import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { WEBSITE_LEAD_COLUMNS, WEBSITE_LEAD_STATUSES } from "@/lib/website-leads";

export const dynamic = "force-dynamic";


/** GET: list (optionally by status); `?format=csv` downloads everything. */
export async function GET(req: NextRequest) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const status = req.nextUrl.searchParams.get("status");
  const supabase = createSupabaseServiceClient();
  let query = supabase.from("website_leads").select(WEBSITE_LEAD_COLUMNS).order("created_at", { ascending: false }).limit(1000);
  if (status && (WEBSITE_LEAD_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message, missingTable: /website_leads/.test(error.message) }, { status: 500 });

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["created_at", "status", "name", "company", "email", "phone", "country", "market", "buyer_type", "products", "wants_samples", "message", "utm_source", "referrer"];
    const rows = (data ?? []).map((r) =>
      [
        r.created_at, r.status, r.name, r.company, r.email, r.phone, r.country, r.market, r.buyer_type,
        (r.items as { name: string; quantity: number | null; unit: string }[]).map((i) => `${i.name} ${i.quantity ?? ""}${i.quantity ? i.unit : ""}`.trim()).join("; "),
        r.wants_samples ? "yes" : "", r.message, r.utm_source, r.referrer,
      ].map(cell).join(",")
    );
    return new NextResponse([header.join(","), ...rows].join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="website-leads-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  }
  return NextResponse.json({ data });
}

const PatchSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(WEBSITE_LEAD_STATUSES).optional(),
    quote_notes: z.string().max(4000).nullable().optional(),
  })
  .strict();

/** PATCH: status and notes only. Moving to "quoted" stamps quoted_at. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  const { id, ...fields } = parsed.data;

  const patch: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
  if (fields.status === "quoted") patch.quoted_at = new Date().toISOString();

  const { data, error } = await createSupabaseServiceClient()
    .from("website_leads")
    .update(patch)
    .eq("id", id)
    .select(WEBSITE_LEAD_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
