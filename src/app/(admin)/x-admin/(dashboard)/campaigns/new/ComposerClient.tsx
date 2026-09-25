"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Send,
  Eye,
  Save,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Paperclip,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  PenLine,
} from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { SELECTION_STORAGE_KEY } from "../../leads/LeadsClient";
import { PENDING_TEMPLATE_KEY } from "@/lib/templates";

/**
 * A compose window, not a settings form.
 *
 * The earlier version was a stack of labelled fields, which meant the
 * person writing a cold email had no idea what the result would look
 * like or who exactly would receive it. This mirrors the layout of the
 * mail client the sender already uses every day — From, To, Subject,
 * body, signature, attachments, send — because that layout is what makes
 * the difference between the two obvious.
 */

interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string;
}

interface Recipient {
  /** Null for an address the sender typed in rather than a lead. */
  lead_id: string | null;
  to_email: string;
  to_name: string | null;
}

interface AudienceInfo {
  count: number;
  dropped: { noEmail: number; duplicate: number; suppressed: number };
  recipients: Recipient[];
  firstLeadId: string | null;
}

interface EditableRecipient {
  key: string;
  leadId: string | null;
  email: string;
  name: string | null;
}

interface Attachment {
  name: string;
  path: string;
  size: number;
  type: string;
}

type Identity = "domestic" | "export";

interface IdentityStatus {
  configured: boolean;
  fromAddress: string | null;
  defaultSenderName: string;
}

interface Props {
  templates: Template[];
  adminEmail: string;
  mailerByIdentity: Record<Identity, IdentityStatus>;
  signatureHtml: string;
}

const STARTER_BODY = [
  // "Dear <full name>" — the greeting Indian B2B correspondence
  // actually uses. {{full_name}} is the cleaned first+last name, and
  // falls back to "Sir/Madam" for the nine catalogue records that
  // carry no contact name at all.
  "<p>Dear {{full_name}},</p>",
  "<p>{{icebreaker}}</p>",
  "<p>I'm with PuraVida Natural — we manufacture and export standardised " +
    "botanical extracts, essential oils, oleoresins and fruit powders from " +
    "India, with a full COA available for every batch.</p>",
  "<p>Given what {{company}} works on, the lines most likely to be relevant " +
    "are {{products}}.</p>",
  "<p>Would it be worth sending our catalogue and current price list?</p>",
].join("");

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ComposerClient({
  templates,
  adminEmail,
  mailerByIdentity,
  signatureHtml,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Which mailbox this campaign sends from: rk@ for the original
  // India-market catalogue, exports@ for the international batches.
  // Picked once up front because it decides which recipients make
  // sense — mixing the two in one send is the thing this exists to
  // prevent.
  const [identity, setIdentity] = useState<Identity>("domestic");
  const mailer = mailerByIdentity[identity];
  const mailerConfigured = mailer.configured;
  const fromAddress = mailer.fromAddress;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(STARTER_BODY);
  // The editor is uncontrolled, so loading a saved email into it means
  // remounting it with new initial content; `key` forces exactly that.
  const [editorSeed, setEditorSeed] = useState({ key: "starter", html: STARTER_BODY });
  // Set once this draft exists in Saved emails, so saving again updates
  // it rather than piling up copies.
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [senderName, setSenderName] = useState(mailerByIdentity.domestic.defaultSenderName);
  const [batchSize, setBatchSize] = useState(8);
  const [includeSignature, setIncludeSignature] = useState(true);
  // Off by default. The open pixel and rewritten links are two of the
  // clearest bulk-mail tells Gmail looks for, and a message filed under
  // Promotions is not read — which costs far more than the numbers are
  // worth on a first approach.
  const [trackOpens, setTrackOpens] = useState(false);

  const [audience, setAudience] = useState<AudienceInfo | null>(null);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [showRecipients, setShowRecipients] = useState(false);
  /**
   * The working recipient list.
   *
   * Seeded from the resolved audience, then owned by the composer: rows
   * can be removed, an address corrected, or a new one typed in. `key`
   * is a stable local identity because `lead_id` is null for anything
   * added by hand and an email can be edited out from under itself.
   */
  const [rows, setRows] = useState<EditableRecipient[]>([]);
  const [edited, setEdited] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [unknownTokens, setUnknownTokens] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const [testAddress, setTestAddress] = useState(adminEmail);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  // Only auto-fill senderName from the identity's default while the
  // sender hasn't typed their own — switching identity should not
  // clobber a name they deliberately chose.
  const senderNameEdited = useRef(false);

  useEffect(() => {
    if (!senderNameEdited.current) setSenderName(mailer.defaultSenderName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const mode = searchParams.get("mode") === "ids" ? "ids" : "filters";

  const storedSelection = useCallback(() => {
    if (mode === "ids") {
      const raw = sessionStorage.getItem(SELECTION_STORAGE_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { ids: string[] };
        if (!parsed.ids?.length) return null;
        return { mode: "ids" as const, ids: parsed.ids };
      } catch {
        return null;
      }
    }
    const query = new URLSearchParams(searchParams.toString());
    query.delete("mode");
    return { mode: "filters" as const, query: query.toString() };
  }, [mode, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const payload = storedSelection();
      if (!payload) {
        setAudienceError(
          "No audience was carried over. Pick the leads you want on the Leads page, then choose Email."
        );
        setLoadingAudience(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/campaigns/audience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "Could not resolve the audience");
        const data = json.data as AudienceInfo;
        setAudience(data);
        setRows(
          data.recipients.map((r, index) => ({
            key: `${r.lead_id ?? "manual"}-${index}`,
            leadId: r.lead_id,
            email: r.to_email,
            name: r.to_name,
          }))
        );
      } catch (err) {
        if (!cancelled) setAudienceError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoadingAudience(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [storedSelection]);

  function applyTemplate(id: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body_html);
    setEditorSeed({ key: `${template.id}-${Date.now()}`, html: template.body_html });
    setTemplateId(template.id);
    setName((current) => current || template.name);
  }

  // A saved email chosen on the Saved emails page arrives here via
  // session storage. Applied after mount, not during render: storage
  // does not exist on the server, and reading it while rendering would
  // make the server and browser disagree about the editor's contents.
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_TEMPLATE_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
    void Promise.resolve().then(() => applyTemplate(pending));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * "Save as draft" keeps the email itself for reuse — name, subject and
   * body — in Saved emails. It does not need recipients, and pressing it
   * again on the same draft updates that one entry.
   */
  async function saveDraft() {
    if (!body.replace(/<[^>]+>/g, "").trim()) {
      setError("Write something before saving.");
      return;
    }
    setSavingDraft(true);
    setError(null);
    setDraftNotice(null);

    const payload = {
      name: name.trim() || subject.trim() || "Untitled email",
      subject: subject.trim(),
      bodyHtml: body,
    };

    try {
      const res = await fetch(
        templateId ? `/api/admin/templates/${templateId}` : "/api/admin/templates",
        {
          method: templateId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      setTemplateId(json.data.id);
      if (!name.trim()) setName(payload.name);
      setDraftNotice(
        `Saved as "${payload.name}" — find it any time under Saved emails.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingDraft(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/campaigns/attachments", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setAttachments((list) => [...list, json.data as Attachment]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAttachment(attachment: Attachment) {
    setAttachments((list) => list.filter((a) => a.path !== attachment.path));
    // Best-effort cleanup; an orphaned blob is harmless next to a
    // broken composer if this fails.
    fetch(`/api/admin/campaigns/attachments?path=${encodeURIComponent(attachment.path)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  async function runPreview(sendTestTo?: string) {
    if (!subject.trim() || !body.trim()) {
      setError("Add a subject and a body first.");
      return;
    }
    setPreviewing(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          bodyHtml: body,
          senderName,
          includeSignature,
          trackOpens,
          identity,
          leadId: rows[0]?.leadId ?? audience?.firstLeadId ?? undefined,
          sendTestTo,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Preview failed");

      setPreview({ subject: json.data.subject, html: json.data.html });
      setUnknownTokens(json.data.unknownTokens ?? []);

      if (json.data.testSend) {
        setTestResult(
          json.data.testSend.ok
            ? `Test sent to ${sendTestTo}.`
            : `Test failed: ${json.data.testSend.error}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewing(false);
    }
  }

  async function submit(startNow: boolean) {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError("Campaign name, subject and body are all required.");
      setShowSettings(true);
      return;
    }
    if (rows.length === 0) {
      setError("There are no recipients left to send to.");
      return;
    }

    const stored = storedSelection();

    // An untouched filter selection stays a filter, so it is re-resolved
    // at send time and a late unsubscribe is still honoured. The moment
    // the list is edited it no longer describes a filter, and the exact
    // addresses on screen are sent instead.
    const payload =
      !edited && stored?.mode === "filters"
        ? stored
        : {
            mode: "explicit" as const,
            recipients: rows.map((r) => ({
              leadId: r.leadId,
              email: r.email.trim(),
              name: r.name,
            })),
          };

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          bodyHtml: body,
          senderName: senderName.trim() || undefined,
          batchSize,
          trackOpens,
          identity,
          attachments,
          audience: payload,
          startNow,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create the campaign");

      sessionStorage.removeItem(SELECTION_STORAGE_KEY);
      router.push(`/x-admin/campaigns/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
      setConfirmSend(false);
    }
  }

  const dropped = audience?.dropped;
  const droppedTotal = dropped
    ? dropped.noEmail + dropped.duplicate + dropped.suppressed
    : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Title bar */}
      <div className="flex items-center gap-3">
        <Link
          href="/x-admin/leads"
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-xl font-bold text-white">New campaign</h1>
        {!mailerConfigured && (
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
            SMTP not configured
          </span>
        )}
      </div>

      {/* ── The compose window ─────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {/* From */}
        <HeaderRow label="From">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-lg border border-zinc-700 text-xs font-medium">
              {(["domestic", "export"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIdentity(id)}
                  className={`px-2.5 py-1 transition-colors ${
                    identity === id
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {id === "domestic" ? "Domestic (India)" : "Export"}
                </button>
              ))}
            </div>
            <span className={mailerConfigured ? "text-zinc-300" : "text-amber-300"}>
              {fromAddress ?? `${identity === "export" ? "Export" : "Domestic"} SMTP not configured`}
            </span>
          </div>
        </HeaderRow>

        {/* To */}
        <HeaderRow label="To">
          {loadingAudience ? (
            <span className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Resolving recipients…
            </span>
          ) : audienceError ? (
            <span className="text-amber-300">{audienceError}</span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecipients((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
              >
                {rows.length.toLocaleString()} recipient
                {rows.length === 1 ? "" : "s"}
                {showRecipients ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {!showRecipients &&
                rows.slice(0, 3).map((r) => (
                  <span
                    key={r.key}
                    className="max-w-[220px] truncate rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-400"
                    title={r.email}
                  >
                    {r.name ?? r.email}
                  </span>
                ))}
              {!showRecipients && rows.length > 3 && (
                <span className="text-xs text-zinc-600">
                  +{rows.length - 3} more
                </span>
              )}

              {edited && (
                <span className="text-xs text-amber-400/70">edited</span>
              )}
            </div>
          )}
        </HeaderRow>

        {/* Expanded recipient list — every address editable */}
        {showRecipients && audience && (
          <div className="max-h-72 overflow-y-auto border-b border-zinc-800 bg-zinc-950/40 px-4 py-2">
            {rows.map((r) => (
              <div
                key={r.key}
                className="group flex items-center gap-2 border-b border-zinc-800/50 py-1.5 last:border-0"
              >
                <input
                  value={r.name ?? ""}
                  onChange={(e) => {
                    setEdited(true);
                    setRows((list) =>
                      list.map((x) =>
                        x.key === r.key ? { ...x, name: e.target.value } : x
                      )
                    );
                  }}
                  placeholder="Name"
                  className="w-40 flex-shrink-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-zinc-300 placeholder-zinc-700 outline-none hover:border-zinc-700 focus:border-emerald-500/50 focus:bg-zinc-900"
                />
                <input
                  value={r.email}
                  onChange={(e) => {
                    setEdited(true);
                    setRows((list) =>
                      list.map((x) =>
                        x.key === r.key ? { ...x, email: e.target.value } : x
                      )
                    );
                  }}
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-zinc-400 outline-none hover:border-zinc-700 focus:border-emerald-500/50 focus:bg-zinc-900"
                />
                {!r.leadId && (
                  <span
                    title="Typed in by hand — not linked to a lead, so replies will not update the CRM"
                    className="flex-shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300"
                  >
                    manual
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEdited(true);
                    setRows((list) => list.filter((x) => x.key !== r.key));
                  }}
                  title="Remove from this campaign"
                  className="flex-shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Add one by hand */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const email = newEmail.trim();
                // Deliberately permissive: the server validates properly,
                // and a picky client-side regex rejects valid addresses.
                if (!email.includes("@")) return;
                setEdited(true);
                setRows((list) => [
                  ...list,
                  {
                    key: `manual-${Date.now()}`,
                    leadId: null,
                    email,
                    name: newName.trim() || null,
                  },
                ]);
                setNewEmail("");
                setNewName("");
              }}
              className="flex items-center gap-2 py-2"
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (optional)"
                className="w-40 flex-shrink-0 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
              />
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="add.someone@company.com"
                type="email"
                className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={!newEmail.includes("@")}
                className="flex-shrink-0 rounded-md bg-zinc-800 px-2.5 py-1 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
            {droppedTotal > 0 && dropped && (
              <p className="py-2 text-xs text-zinc-600">
                {droppedTotal} already excluded:{" "}
                {[
                  dropped.noEmail && `${dropped.noEmail} with no email`,
                  dropped.duplicate && `${dropped.duplicate} duplicate`,
                  dropped.suppressed && `${dropped.suppressed} unsubscribed`,
                ]
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
            )}
          </div>
        )}

        {/* Subject */}
        <HeaderRow label="Subject">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Botanical extracts for {{company}}"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
        </HeaderRow>

        {/* Body */}
        <RichTextEditor
          key={editorSeed.key}
          initialHtml={editorSeed.html}
          onChange={setBody}
          placeholder="Write your message…"
        />

        {/* Signature */}
        <div className="border-t border-zinc-800/70 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <PenLine className="h-3.5 w-3.5" />
              Signature — added automatically
            </span>
            <button
              type="button"
              onClick={() => setIncludeSignature((v) => !v)}
              className="text-xs text-zinc-500 underline hover:text-zinc-300"
            >
              {includeSignature ? "Remove from this campaign" : "Add back"}
            </button>
          </div>
          {includeSignature ? (
            <div
              className="rounded-xl bg-white px-4 py-3 text-[13px]"
              // Rendered from the app's own signature module, not from
              // anything a user typed.
              dangerouslySetInnerHTML={{ __html: signatureHtml }}
            />
          ) : (
            <p className="text-xs text-zinc-600">
              No signature. The unsubscribe line and postal address are still
              added — they are legally required.
            </p>
          )}
        </div>

        {/* Attachments */}
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || attachments.length >= 5}
              className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              Attach
            </button>

            {attachments.map((a) => (
              <span
                key={a.path}
                className="flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-300"
              >
                <FileText className="h-3.5 w-3.5 text-zinc-500" />
                <span className="max-w-[180px] truncate">{a.name}</span>
                <span className="text-zinc-600">{formatSize(a.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a)}
                  className="text-zinc-600 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>

          {attachments.length > 0 && (
            <p className="mt-2 text-xs text-amber-400/80">
              An attachment from an unknown sender is one of the strongest spam
              signals there is, and some corporate gateways quarantine on sight.
              For a first approach, a link to the catalogue usually lands better.
            </p>
          )}
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {confirmSend ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <span className="text-sm text-emerald-200">
              Send to {rows.length.toLocaleString()} people?
            </span>
            <button
              onClick={() => submit(true)}
              disabled={submitting}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {submitting ? "Starting…" : "Yes, start sending"}
            </button>
            <button
              onClick={() => setConfirmSend(false)}
              className="px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmSend(true)}
            disabled={submitting || rows.length === 0 || !mailerConfigured}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        )}

        <button
          onClick={() => runPreview()}
          disabled={previewing}
          className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {previewing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Preview
        </button>

        <button
          onClick={saveDraft}
          disabled={savingDraft}
          className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {savingDraft ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {templateId ? "Update draft" : "Save as draft"}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <input
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={() => runPreview(testAddress)}
            disabled={previewing || !mailerConfigured || !testAddress}
            className="rounded-xl bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            Send test
          </button>
        </div>

        <button
          onClick={() => setShowSettings((v) => !v)}
          className="rounded-xl bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Settings
        </button>
      </div>

      {/* Campaign settings — internal, so folded away by default */}
      {showSettings && (
        <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-3">
          <Field label="Campaign name" hint="Internal only.">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="IPHEX nutraceutical buyers — March"
              className={inputClass}
            />
          </Field>
          <Field label="Your name" hint="Signs the message.">
            <input
              value={senderName}
              onChange={(e) => {
                senderNameEdited.current = true;
                setSenderName(e.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field
            label="Emails per batch"
            hint="Per 5-minute dispatch. 8 ≈ 96/hour."
          >
            <input
              type="number"
              min={1}
              max={200}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value) || 8)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Track opens & clicks"
            hint="Costs inbox placement."
          >
            <label className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <input
                type="checkbox"
                checked={trackOpens}
                onChange={(e) => setTrackOpens(e.target.checked)}
                className="mt-0.5 accent-emerald-500"
              />
              <span className="text-xs leading-relaxed text-zinc-400">
                Adds a tracking pixel and routes links through a redirect.
                Gmail reads both as bulk mail and is more likely to file the
                message under Promotions, where it will not be read. Leave
                off for cold outreach.
              </span>
            </label>
          </Field>

          {templates.length > 0 && (
            <Field label="Start from a saved email">
              <select
                defaultValue=""
                onChange={(e) => applyTemplate(e.target.value)}
                className={inputClass}
              >
                <option value="">Write from scratch</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      )}

      {testResult && (
        <Notice tone={testResult.startsWith("Test sent") ? "emerald" : "red"}>
          {testResult}
        </Notice>
      )}
      {unknownTokens.length > 0 && (
        <Notice tone="amber">
          Unknown fields will be sent as literal text:{" "}
          <strong>{unknownTokens.map((t) => `{{${t}}}`).join(", ")}</strong>
        </Notice>
      )}
      {draftNotice && (
        <Notice tone="emerald">
          {draftNotice}{" "}
          <Link href="/x-admin/templates" className="font-semibold underline">
            Open Saved emails
          </Link>
        </Notice>
      )}
      {error && <Notice tone="red">{error}</Notice>}

      {/* Preview */}
      {preview && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-white">
          <div className="border-b border-zinc-200 bg-zinc-100 px-4 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">
              Subject
            </div>
            <div className="text-sm font-semibold text-zinc-900">
              {preview.subject}
            </div>
          </div>
          <iframe
            title="Email preview"
            // Fully sandboxed: the preview renders admin-authored HTML
            // merged with third-party values, and neither needs scripts.
            sandbox=""
            srcDoc={preview.html}
            className="h-[560px] w-full border-0"
          />
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500/50";

function HeaderRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-zinc-800 px-4 py-2.5">
      <span className="w-16 flex-shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        {hint && <span className="ml-2 text-xs text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "amber" | "red" | "emerald";
  children: React.ReactNode;
}) {
  const styles = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  }[tone];

  return (
    <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
}
