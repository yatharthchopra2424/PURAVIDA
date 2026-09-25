"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Globe2,
  Download,
  RefreshCw,
  Mail,
  Phone,
  Package,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
import { WEBSITE_LEAD_STATUSES, type WebsiteLeadStatus } from "@/lib/website-leads";

export interface WebsiteLeadItem {
  productId: string | null;
  name: string;
  slug: string | null;
  categorySlug: string | null;
  quantity: number | null;
  unit: string;
  grade: string | null;
  matched: boolean;
  requestedAs: string | null;
}

export interface WebsiteLead {
  id: string;
  created_at: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  market: string;
  buyer_type: string | null;
  items: WebsiteLeadItem[];
  message: string | null;
  wants_samples: boolean;
  status: WebsiteLeadStatus;
  quote_notes: string | null;
  quoted_at: string | null;
  source_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ip_country: string | null;
  lead_id: string | null;
  confirmation_sent: boolean;
  notification_sent: boolean;
  email_error: string | null;
}

const STATUS_STYLE: Record<WebsiteLeadStatus, string> = {
  new: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  contacted: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  quoted: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  won: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  lost: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
  spam: "bg-red-500/15 text-red-300 ring-red-500/30",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const qty = (i: WebsiteLeadItem) => (i.quantity ? `${i.quantity.toLocaleString("en-IN")} ${i.unit}` : "qty tbd");

export default function WebsiteLeadsClient({
  initial,
  missingTable,
  legacyCount,
}: {
  initial: WebsiteLead[];
  missingTable: boolean;
  legacyCount: number;
}) {
  const [leads, setLeads] = useState(initial);
  const [tab, setTab] = useState<WebsiteLeadStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);
  const shown = tab === "all" ? leads : leads.filter((l) => l.status === tab);
  const open = leads.find((l) => l.id === openId) ?? null;

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/website-leads");
      const json = await res.json();
      if (json.data) setLeads(json.data);
    } finally {
      setRefreshing(false);
    }
  }

  async function update(id: string, patch: { status?: WebsiteLeadStatus; quote_notes?: string | null }) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/website-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const json = await res.json();
      if (json.data) setLeads((ls) => ls.map((l) => (l.id === id ? json.data : l)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
            <Globe2 className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Website Leads</h1>
            <p className="text-sm text-zinc-500">Quote requests from the website. Each one is also added to Leads.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="flex h-10 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <a
            href="/api/admin/website-leads?format=csv"
            className="flex h-10 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <Download className="h-4 w-4" /> CSV
          </a>
        </div>
      </div>

      {missingTable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            The <code>website_leads</code> table doesn&apos;t exist yet. Run <code>scripts/website-schema.sql</code> in the
            Supabase SQL editor. Until then, enquiries are still saved to the old Inquiries inbox
            {legacyCount ? ` (${legacyCount} there)` : ""} and emailed to the team, so nothing is lost.
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...WEBSITE_LEAD_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`h-9 rounded-lg px-3 text-sm font-medium capitalize transition-colors ${
              tab === s ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {s} <span className="ml-1 text-xs opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 py-16 text-center text-sm text-zinc-500">
          <Globe2 className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
          No website leads {tab === "all" ? "yet" : `with status “${tab}”`}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="hidden px-4 py-3 md:table-cell">Products</th>
                <th className="hidden px-4 py-3 lg:table-cell">Country</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {shown.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => {
                    setOpenId(l.id);
                    setNotes(l.quote_notes ?? "");
                  }}
                  className="cursor-pointer transition-colors hover:bg-zinc-900/70"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{when(l.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-100">{l.name}</p>
                    <p className="text-xs text-zinc-500">{l.company || l.email}</p>
                  </td>
                  <td className="hidden max-w-sm px-4 py-3 text-zinc-300 md:table-cell">
                    <p className="truncate">{l.items.map((i) => i.name).join(", ") || "—"}</p>
                    {l.wants_samples && <span className="text-xs text-emerald-400">samples requested</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-400 lg:table-cell">{l.country || l.ip_country || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ${STATUS_STYLE[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setOpenId(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">{open.name}</h2>
                <p className="text-sm text-zinc-500">
                  {[open.company, open.buyer_type, open.country].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <a
                href={`mailto:${open.email}?subject=${encodeURIComponent("Your quote request | PuraVida Natural")}`}
                className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <Mail className="h-4 w-4" /> Reply by email
              </a>
              {open.phone && (
                <a href={`tel:${open.phone}`} className="flex h-9 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-200 hover:bg-zinc-700">
                  <Phone className="h-4 w-4" /> {open.phone}
                </a>
              )}
              {open.phone && (
                <a
                  href={`https://wa.me/${open.phone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-200 hover:bg-zinc-700"
                >
                  WhatsApp
                </a>
              )}
              {open.lead_id && (
                <Link href={`/x-admin/leads?search=${encodeURIComponent(open.email)}`} className="flex h-9 items-center gap-2 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-200 hover:bg-zinc-700">
                  <ExternalLink className="h-4 w-4" /> In Leads
                </Link>
              )}
            </div>

            <section className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Requested products</p>
              {open.items.length === 0 && <p className="text-sm text-zinc-500">No products listed. See message.</p>}
              <ul className="space-y-2">
                {open.items.map((i, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 rounded-xl bg-zinc-900 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-zinc-100">
                        <Package className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                        {i.slug && i.categorySlug ? (
                          <a href={`/products/${i.categorySlug}/${i.slug}`} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                            {i.name}
                          </a>
                        ) : (
                          <span className="truncate">{i.name}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {i.matched ? "Catalogue match" : <span className="text-amber-400">Not in catalogue</span>}
                        {i.requestedAs ? ` · typed “${i.requestedAs}”` : ""}
                        {i.grade ? ` · grade ${i.grade}` : ""}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm text-zinc-300">{qty(i)}</span>
                  </li>
                ))}
              </ul>
              {open.wants_samples && (
                <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                  <FlaskConical className="h-4 w-4" /> Samples requested
                </p>
              )}
            </section>

            {open.message && (
              <section className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Message</p>
                <p className="whitespace-pre-line rounded-xl bg-zinc-900 p-3 text-sm text-zinc-300">{open.message}</p>
              </section>
            )}

            <section className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {WEBSITE_LEAD_STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={saving}
                    onClick={() => update(open.id, { status: s })}
                    className={`h-8 rounded-lg px-3 text-xs font-medium capitalize ring-1 transition-colors ${
                      open.status === s ? STATUS_STYLE[s] : "text-zinc-400 ring-zinc-800 hover:bg-zinc-900"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <section className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Quote notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Price quoted, MOQ, follow-up date…"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
              <button
                disabled={saving || notes === (open.quote_notes ?? "")}
                onClick={() => update(open.id, { quote_notes: notes || null })}
                className="mt-2 h-9 rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-900 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save notes"}
              </button>
            </section>

            <section className="space-y-1 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
              <p>Email: {open.email}</p>
              <p>Received {new Date(open.created_at).toLocaleString("en-IN")} · market {open.market}</p>
              <p>
                Came from: {open.utm_source ? `${open.utm_source}/${open.utm_medium ?? "-"}/${open.utm_campaign ?? "-"}` : open.referrer || "direct"}
                {open.source_page ? ` · page ${open.source_page}` : ""}
              </p>
              <p className="flex items-center gap-1.5">
                {open.confirmation_sent ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                Confirmation email {open.confirmation_sent ? "sent" : "not sent"} ·
                team notification {open.notification_sent ? "sent" : "not sent"}
              </p>
              {open.email_error && <p className="text-amber-400">Email error: {open.email_error}</p>}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
