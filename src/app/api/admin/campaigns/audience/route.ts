import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import { parseLeadFilters } from "@/lib/leads";
import { resolveAudience, MAX_AUDIENCE } from "@/lib/campaigns";

/**
 * Dry run of the audience resolution.
 *
 * The composer needs to state exactly who would receive the mail — and
 * why the number is smaller than the number of rows the admin ticked —
 * before anything is queued. It runs the same `resolveAudience` the
 * send path uses, so the count shown is the count that will be sent.
 */
const AudienceSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("ids"), ids: z.array(z.uuid()).min(1).max(MAX_AUDIENCE) }),
  z.object({ mode: z.literal("filters"), query: z.string().max(2000) }),
  z.object({
    mode: z.literal("explicit"),
    recipients: z
      .array(
        z.object({
          leadId: z.uuid().nullable().optional(),
          email: z.email().max(200),
          name: z.string().max(160).nullable().optional(),
        })
      )
      .min(1)
      .max(MAX_AUDIENCE),
  }),
]);

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AudienceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await resolveAudience(
      parsed.data.mode === "filters"
        ? {
            mode: "filters",
            filters: parseLeadFilters(new URLSearchParams(parsed.data.query)),
          }
        : parsed.data
    );

    return NextResponse.json({
      data: {
        count: result.members.length,
        dropped: result.dropped,
        // The full list, not a sample: the composer shows recipients the
        // way a mail client does and lets individual ones be removed
        // before sending, which it cannot do without their names.
        recipients: result.members,
        firstLeadId: result.members[0]?.lead_id ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
