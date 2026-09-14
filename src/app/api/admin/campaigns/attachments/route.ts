import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminUser } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { ATTACHMENT_BUCKET } from "@/lib/campaigns";

/**
 * Upload for campaign attachments.
 *
 * The bucket is private: files are read back with the service-role key
 * at send time and embedded in the message, never linked. A public URL
 * would make every attachment world-readable to anyone who guessed the
 * path, and a price list is not something to leave open.
 *
 * Attachments are also the single biggest deliverability cost in cold
 * outreach — an unsolicited attachment from an unknown sender is a
 * strong spam signal, and several corporate gateways strip or quarantine
 * on sight. The composer says so; this route enforces the limits.
 */

/** Per-file ceiling. Anything larger belongs behind a link. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Formats a recipient is likely to be able to open, and that gateways
 * do not reject outright. Deliberately no archives or Office macros —
 * .zip and .docm are refused by most corporate mail filters.
 */
const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx",
  ],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
]);

/** Keeps the original name readable but safe to put in a header. */
function safeName(name: string): string {
  const cleaned = name
    .replace(/[\r\n]/g, " ")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 80) || "attachment";
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = ALLOWED.get(file.type);
  if (!extension) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Attach a PDF, image, XLSX or DOCX — archives and macro documents are rejected by most mail gateways anyway.",
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB — anything bigger should be a link to the catalogue instead.`,
      },
      { status: 400 }
    );
  }

  const name = safeName(file.name);
  // Random prefix: two campaigns attaching "price-list.pdf" must not
  // overwrite each other, and the path should not be guessable.
  const storagePath = `${randomUUID()}/${name}`;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    const missingBucket = /bucket not found/i.test(error.message);
    return NextResponse.json(
      {
        error: missingBucket
          ? `The "${ATTACHMENT_BUCKET}" storage bucket does not exist. Create it in Supabase → Storage, and leave it private.`
          : error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { name, path: storagePath, size: file.size, type: file.type },
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminUser();
  if (auth instanceof NextResponse) return auth;

  const path = new URL(req.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "No path given" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
