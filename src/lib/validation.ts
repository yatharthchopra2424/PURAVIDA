import { z } from "zod";

/**
 * Request validation schemas.
 *
 * Every admin PATCH previously passed the raw request body straight
 * into `.update(body)`, so any column was writable — including `id`,
 * which would let a caller reassign a primary key and break foreign
 * key relationships. `.strict()` rejects unknown keys outright rather
 * than silently dropping them, so a typo in the admin UI surfaces as
 * a 400 instead of a no-op.
 */

const QUALITY_BADGES = [
  "ISO",
  "GMP",
  "FSSAI",
  "Halal",
  "FDA",
  "Export",
] as const;

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Must be lowercase alphanumeric words separated by single hyphens"
  );

const optionalText = (max: number) =>
  z.string().max(max).nullable().optional();

// ── Products ────────────────────────────────────────────────

export const ProductCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug,
    category_id: z.string().min(1).max(120),
    botanical_name: optionalText(200),
    active_ingredient: optionalText(200),
    active_compound: optionalText(200),
    concentration: optionalText(100),
    applications: z.array(z.string().min(1).max(120)).max(50).optional(),
    description: optionalText(5000),
    image_path: optionalText(500),
    quality_badges: z.array(z.enum(QUALITY_BADGES)).max(10).optional(),
    is_halal: z.boolean().optional(),
    popularity: z.number().int().min(0).max(100).optional(),
  })
  .strict();

// Same shape, every field optional, and `id` deliberately absent.
export const ProductUpdateSchema = ProductCreateSchema.partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ── Categories ──────────────────────────────────────────────

export const CategoryCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug,
    label: optionalText(120),
    description: optionalText(2000),
    image: optionalText(500),
    subcategories: z.array(z.string().min(1).max(120)).max(50).optional(),
    example_products: z.array(z.string().min(1).max(200)).max(50).optional(),
    product_count: z.number().int().min(0).optional(),
  })
  .strict();

export const CategoryUpdateSchema = CategoryCreateSchema.partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ── Inquiries ───────────────────────────────────────────────

export const InquiryUpdateSchema = z
  .object({
    is_read: z.boolean(),
  })
  .strict();

// ── Public contact form ─────────────────────────────────────

export const ContactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().trim().email("Enter a valid email address").max(254),
    product: z.string().trim().max(500).optional().default(""),
    quantity: z.string().trim().max(120).optional().default(""),
    // Previously unbounded — a 10 MB string went straight into Postgres.
    description: z.string().trim().max(5000).optional().default(""),
    cartItems: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          quantity: z.number().int().min(1).max(100000),
        })
      )
      .max(100)
      .optional()
      .default([]),
    // Honeypot: hidden in the UI, so a human never fills it. Bots that
    // blindly complete every input do.
    //
    // Deliberately permissive — the schema ACCEPTS a filled honeypot so
    // the route can inspect it and reply 200 as though the submission
    // succeeded. Rejecting it here would return a 400 with field
    // errors, telling the bot exactly which field gave it away.
    company_website: z.string().max(200).optional().default(""),
  })
  .strict();

export type ContactInput = z.infer<typeof ContactSchema>;

// ── Shared helper ───────────────────────────────────────────

/**
 * Flattens Zod issues into `{ field: message }` so the admin UI can
 * highlight the offending input instead of showing a raw dump.
 */
export function formatZodIssues(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
