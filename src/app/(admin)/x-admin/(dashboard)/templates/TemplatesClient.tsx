"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Send, Trash2, Eye, EyeOff, Plus, AlertTriangle } from "lucide-react";
import { PENDING_TEMPLATE_KEY, type EmailTemplate } from "@/lib/templates";

/**
 * Saved emails, ready to send again.
 *
 * "Use" does not open the composer directly: a campaign needs people to
 * send to, so it goes to Leads to pick them, carrying the chosen email
 * along. The composer then opens with that email already written.
 */
export default function TemplatesClient({
  initialTemplates,
  loadError,
}: {
  initialTemplates: EmailTemplate[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError);

  function sendWithTemplate(template: EmailTemplate) {
    sessionStorage.setItem(PENDING_TEMPLATE_KEY, template.id);
    router.push("/x-admin/leads");
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not delete");
      return;
    }
    setTemplates((list) => list.filter((t) => t.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Saved emails</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Write once, send again. Recipients are picked fresh each time.
          </p>
        </div>
        <Link
          href="/x-admin/leads"
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Write a new email
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {templates.length === 0 && !error ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
          <FileText className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-400">No saved emails yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            Press <strong className="text-zinc-400">Save as draft</strong> in the
            composer and the email appears here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const open = openId === template.id;
            return (
              <div
                key={template.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <FileText className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-zinc-100">{template.name}</div>
                    <div className="truncate text-xs text-zinc-500">
                      {template.subject || "(no subject)"} · updated{" "}
                      {new Date(template.updated_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setOpenId(open ? null : template.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {open ? "Hide" : "View"}
                  </button>

                  <button
                    onClick={() => sendWithTemplate(template)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Use this email
                  </button>

                  {confirmDelete === template.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        onClick={() => remove(template.id)}
                        className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-1.5 text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(template.id)}
                      title="Delete"
                      className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {open && (
                  <div className="border-t border-zinc-800 bg-white px-5 py-4">
                    <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                      Subject: <span className="normal-case text-zinc-800">{template.subject}</span>
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-[14px] leading-relaxed text-zinc-800 [&_p]:my-2"
                      // Sanitised by the API before it was stored.
                      dangerouslySetInnerHTML={{ __html: template.body_html }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
