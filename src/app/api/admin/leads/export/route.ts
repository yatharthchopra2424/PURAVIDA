import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { applyLeadFilters, parseLeadFilters, type Lead } from "@/lib/leads";

/** Hard ceiling so one click cannot try to stream the whole table at once. */
const MAX_ROWS = 5000;
const PAGE_SIZE = 1000;

const COLUMNS: { key: keyof Lead; header: string }[] = [
  { key: "company_name", header: "Company" },
  { key: "contact_name", header: "Contact" },
  { key: "designation", header: "Designation" },
  { key: "email", header: "Email" },
  { key: "company_email", header: "Company Email" },
  { key: "mobile_e164", header: "Mobile" },
  { key: "city_verified", header: "City" },
  { key: "country_verified", header: "Country" },
  { key: "segment", header: "Segment" },
  { key: "tags", header: "Tags" },
  { key: "icp_score", header: "Score" },
  { key: "priority", header: "Priority" },
  { key: "relationship", header: "Relationship" },
  { key: "status", header: "Status" },
  { key: "hall_no", header: "Hall" },
  { key: "stall_no", header: "Stall" },
  { key: "ai_summary", header: "Summary" },
  { key: "pitch_angle", header: "Pitch angle" },
  { key: "icebreaker", header: "Icebreaker" },
  { key: "suggested_products", header: "Suggested products" },
  { key: "data_flags", header: "Data flags" },
  { key: "source", header: "Source" },
  { key: "source_page", header: "Page" },
];

/**
 * RFC 4180 quoting, plus a guard against spreadsheet formula injection:
 * a cell starting =, +, - or @ is executed by Excel and Sheets when the
 * file is opened, and this data came from a third-party PDF.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const filters = parseLeadFilters(searchParams);

  const supabase = createSupabaseServiceClient();
  const select = COLUMNS.map((c) => c.key).join(", ");

  const rows: Record<string, unknown>[] = [];

  // Paged rather than one large range: PostgREST caps a single response,
  // and a 5 000-row export should not depend on where that cap sits.
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await applyLeadFilters(
      supabase.from("leads").select(select),
      filters
    ).range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) break;

    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
  }

  const csv = [
    COLUMNS.map((c) => c.header).join(","),
    ...rows.map((row) => COLUMNS.map((c) => csvCell(row[c.key])).join(",")),
  ].join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(
    // The BOM makes Excel read it as UTF-8 instead of the local codepage,
    // which otherwise mangles every non-ASCII company name.
    `﻿${csv}`,
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="puravida-leads-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
