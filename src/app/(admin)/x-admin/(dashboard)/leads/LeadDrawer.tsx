"use client";

import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  Globe,
} from "lucide-react";
import {
  LEAD_STATUSES,
  STATUS_LABELS,
  TAG_LABELS,
  primaryEmail,
  type Lead,
} from "@/lib/leads";

/** Human wording for the cross-verification flags the AI emits. */
const FLAG_LABELS: Record<string, string> = {
  "email-domain-mismatch": "Email domain does not match the company",
  "personal-email-domain": "Personal email address, not a company domain",
  "name-looks-malformed": "Contact name may be a parsing error",
  "designation-not-decision-maker": "Contact may not influence purchasing",
  "profile-missing": "No company profile in the catalogue",
  "location-corrected": "Location was corrected during verification",
  "possible-duplicate-contact": "May be a second contact at a listed company",
};

interface Props {
  lead: Lead;
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
}

/**
 * Rendered with `key={lead.id}`, so opening a different row remounts
 * this component. That is what keeps one lead's unsaved notes from
 * appearing under another's name — cheaper and less error-prone than
 * syncing local state back to props in an effect.
 */
export default function LeadDrawer({ lead, onClose, onUpdated }: Props) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      onUpdated(json.data as Lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const email = primaryEmail(lead);
  const location = [
    lead.city_verified ?? lead.city,
    lead.state_verified ?? lead.state,
    lead.country_verified ?? lead.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/60 backdrop-blur-[2px]"
      />

      <aside className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-6 py-4 backdrop-blur">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-bold leading-tight text-white">
              {lead.company_name}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              {lead.segment ?? "Not yet classified"}
              {lead.icp_score !== null && (
                <span className="text-emerald-400"> · fit {lead.icp_score}/100</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Contact block */}
          <section className="space-y-2.5">
            <Row icon={Building2}>
              {lead.contact_name ?? "No contact name"}
              {lead.designation && (
                <span className="text-zinc-500"> · {lead.designation}</span>
              )}
            </Row>

            {email && (
              <Row icon={Mail}>
                <a href={`mailto:${email}`} className="text-emerald-400 hover:underline">
                  {email}
                </a>
                <CopyButton
                  copied={copied === "email"}
                  onClick={() => copy(email, "email")}
                />
                {lead.company_email && lead.company_email !== email && (
                  <span className="block text-xs text-zinc-500">
                    also {lead.company_email}
                  </span>
                )}
              </Row>
            )}

            {lead.mobile_e164 && (
              <Row icon={Phone}>
                <a href={`tel:${lead.mobile_e164}`} className="text-zinc-300 hover:underline">
                  {lead.mobile_e164}
                </a>
                <CopyButton
                  copied={copied === "phone"}
                  onClick={() => copy(lead.mobile_e164!, "phone")}
                />
              </Row>
            )}

            {lead.website && (
              <Row icon={Globe}>
                <a
                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-zinc-300 hover:underline"
                >
                  {lead.website}
                </a>
              </Row>
            )}

            {location && <Row icon={MapPin}>{location}</Row>}

            {lead.stall_no && (
              <p className="pl-6 text-xs text-zinc-500">
                {lead.source} · {lead.hall_no} · stall {lead.stall_no}
                {lead.source_page ? ` · page ${lead.source_page}` : ""}
              </p>
            )}
          </section>

          {/* Data flags */}
          {(lead.data_flags ?? []).length > 0 && (
            <section className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Check before sending
              </div>
              <ul className="space-y-1 text-sm text-amber-100/80">
                {(lead.data_flags ?? []).map((flag) => (
                  <li key={flag}>{FLAG_LABELS[flag] ?? flag}</li>
                ))}
              </ul>
            </section>
          )}

          {/* AI insight */}
          {lead.ai_status === "done" ? (
            <section className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                Outreach brief
              </div>

              {lead.ai_summary && (
                <Field label="What they do">{lead.ai_summary}</Field>
              )}
              {lead.pitch_angle && (
                <Field label="Why contact them">{lead.pitch_angle}</Field>
              )}
              {lead.icebreaker && (
                <Field label="Opening line">
                  <span className="italic text-zinc-200">“{lead.icebreaker}”</span>
                  <CopyButton
                    copied={copied === "ice"}
                    onClick={() => copy(lead.icebreaker!, "ice")}
                  />
                </Field>
              )}
              {(lead.suggested_products ?? []).length > 0 && (
                <Field label="Products to lead with">
                  {(lead.suggested_products ?? []).join(", ")}
                </Field>
              )}
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-zinc-500">
                {lead.relationship && <span>Relationship: {lead.relationship.replace("_", " ")}</span>}
                {lead.seniority && <span>Seniority: {lead.seniority.replace("_", " ")}</span>}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              {lead.ai_status === "pending"
                ? "Not yet enriched. Run npm run leads:enrich to generate the outreach brief."
                : `Enrichment ${lead.ai_status}. Retry with npm run leads:enrich -- --redo failed`}
            </section>
          )}

          {/* Tags */}
          {(lead.tags ?? []).length > 0 && (
            <section>
              <SectionLabel>Tags</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {(lead.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                  >
                    {TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Catalogue profile */}
          {lead.company_profile && (
            <section>
              <SectionLabel>Catalogue profile</SectionLabel>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                {lead.company_profile}
              </p>
            </section>
          )}

          {(lead.product_categories ?? []).length > 0 && (
            <section>
              <SectionLabel>Declared categories</SectionLabel>
              <p className="text-sm text-zinc-400">
                {(lead.product_categories ?? []).join(", ")}
              </p>
            </section>
          )}

          {/* CRM */}
          <section className="space-y-3 border-t border-zinc-800 pt-5">
            <div>
              <SectionLabel>Status</SectionLabel>
              <select
                value={lead.status}
                disabled={saving}
                onChange={(e) => patch({ status: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 disabled:opacity-50"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
              {lead.is_suppressed && (
                <p className="mt-1.5 text-xs text-red-400">
                  Suppressed — campaigns will skip this address.
                </p>
              )}
            </div>

            <div>
              <SectionLabel>Notes</SectionLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Call outcome, pricing discussed, next step…"
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={() => patch({ notes: notes.trim() || null })}
                disabled={saving || notes === (lead.notes ?? "")}
                className="mt-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save notes"}
              </button>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-zinc-300">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-600" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-emerald-500/70">
        {label}
      </div>
      <div className="mt-0.5 text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Copy"
      className="ml-1.5 inline-flex align-middle text-zinc-600 transition-colors hover:text-zinc-300"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
