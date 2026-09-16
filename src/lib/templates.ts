import { z } from "zod";

/**
 * Saved emails — written once, reused across campaigns.
 *
 * A template is only the words: name, subject and body. Recipients are
 * deliberately not part of it, because the point is to send the same
 * message to a different audience next time.
 */

export const TEMPLATE_COLUMNS =
  "id, name, subject, body_html, created_by, created_at, updated_at";

export const TemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(200).default(""),
  bodyHtml: z.string().max(200_000),
});

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hands a template from the Templates page to the composer.
 *
 * Choosing "Use" sends the sender to Leads first, because a campaign
 * needs an audience, and the composer picks the template up from here
 * when it opens. Session storage rather than a URL parameter so the
 * choice does not leak into a shareable link.
 */
export const PENDING_TEMPLATE_KEY = "puravida:pending-template";
