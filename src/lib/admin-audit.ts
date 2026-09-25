import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

/**
 * Admin activity log. The proxy stamps every /api/admin request with its
 * real method and path (x-pv-audit-*; any client-sent copy is
 * overwritten), and requireAdminUser calls this once the admin check has
 * passed. Changes and data exports are recorded; ordinary reads are not.
 * Never throws: a logging failure must not block the admin action.
 */
const RESOURCES: Record<string, string> = {
  leads: "lead",
  "website-leads": "website_lead",
  campaigns: "campaign",
  templates: "saved_email",
  products: "product",
  categories: "category",
  inquiries: "inquiry",
  "data-sources": "data_sources",
  "mail-test": "mail_test",
  "upload-image": "image",
};
const VERBS: Record<string, string> = { POST: "create", PATCH: "update", PUT: "update", DELETE: "delete" };

export function describeAction(method: string, path: string): string {
  const parts = path.split("?")[0].split("/").filter(Boolean).slice(2); // after api/admin
  const resource = RESOURCES[parts[0]] ?? parts[0] ?? "admin";
  const last = parts[parts.length - 1];
  if (last === "export") return `${resource}.export`;
  if (last === "dispatch") return `${resource}.send`;
  if (last === "verify") return `${resource}.validate`;
  if (parts.includes("attachments")) return `${resource}.attachment_${VERBS[method] ?? method.toLowerCase()}`;
  if (resource === "mail_test") return "mail_test.send";
  return `${resource}.${VERBS[method] ?? method.toLowerCase()}`;
}

export async function recordAdminAction(user: { id: string; email?: string }): Promise<void> {
  try {
    const h = await headers();
    const method = h.get("x-pv-audit-method");
    const path = h.get("x-pv-audit-path");
    if (!method || !path) return;
    const isExport = /\/export(\?|$)/.test(path) || /[?&]format=csv/.test(path);
    if (method === "GET" && !isExport) return;
    await createSupabaseServiceClient()
      .from("admin_audit_log")
      .insert({
        user_id: user.id,
        email: user.email ?? null,
        method,
        path: path.slice(0, 500),
        action: isExport && method === "GET" ? describeAction("GET", path.replace(/\?.*$/, "/export")) : describeAction(method, path),
        ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
        user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
      });
  } catch {
    /* table missing or DB down: never block the action itself */
  }
}
