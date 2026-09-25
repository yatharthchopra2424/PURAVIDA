"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type State =
  | { kind: "loading" }
  | { kind: "off" }
  | { kind: "enrolling"; factorId: string; qr: string; secret: string }
  | { kind: "on"; factorId: string };

/**
 * TOTP two-factor for the admin account (Supabase Auth MFA). Once a
 * factor is verified, the proxy and every admin API route require the
 * code on each new sign-in (see src/lib/admin-mfa.ts).
 */
export default function TwoFactorPanel() {
  const supabase = createSupabaseBrowserClient();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp.find((f) => f.status === "verified");
    setState(verified ? { kind: "on", factorId: verified.id } : { kind: "off" });
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    // Clear any half-finished enrolment first; Supabase allows only one pending.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `PuraVida admin ${Date.now()}` });
    setBusy(false);
    if (e || !data) return setError(e?.message ?? "Could not start set-up");
    setState({ kind: "enrolling", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (state.kind !== "enrolling") return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: state.factorId, code: code.trim() });
    setBusy(false);
    if (e) return setError("That code didn't match. Use the current 6-digit code from the app.");
    setCode("");
    await load();
  }

  async function disable() {
    if (state.kind !== "on") return;
    if (!confirm_("Turn off two-factor login? Your admin panel will be protected by the password only.")) return;
    setBusy(true);
    const { error: e } = await supabase.auth.mfa.unenroll({ factorId: state.factorId });
    setBusy(false);
    if (e) return setError(e.message);
    await load();
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-3">
        {state.kind === "on" ? (
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-amber-400" />
        )}
        <div>
          <h2 className="font-semibold text-white">Two-factor login</h2>
          <p className="text-sm text-zinc-400">
            {state.kind === "on"
              ? "On. Every new sign-in needs a code from your authenticator app."
              : "Off. Anyone with your password can open the admin panel."}
          </p>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {state.kind === "loading" && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}

      {state.kind === "off" && (
        <button
          onClick={start}
          disabled={busy}
          className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Turn on two-factor login"}
        </button>
      )}

      {state.kind === "enrolling" && (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
            <li>Open Google Authenticator, Microsoft Authenticator or Authy on your phone.</li>
            <li>Scan this QR code (or enter the key below).</li>
            <li>Type the 6-digit code it shows.</li>
          </ol>
          {/* Supabase returns the QR as an SVG data URL generated locally; nothing leaves the browser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="QR code for your authenticator app" className="h-44 w-44 rounded-lg bg-white p-2" />
          <p className="break-all font-mono text-xs text-zinc-500">Key: {state.secret}</p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              aria-label="6-digit code"
              className="h-10 w-36 rounded-lg border border-zinc-700 bg-zinc-800 text-center font-mono tracking-[0.3em] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              onClick={confirm}
              disabled={busy || code.length !== 6}
              className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {busy ? "Checking…" : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {state.kind === "on" && (
        <button onClick={disable} disabled={busy} className="text-sm text-zinc-500 hover:text-red-400">
          Turn off two-factor login
        </button>
      )}
    </section>
  );
}

// window.confirm, named apart from the `confirm` handler above.
const confirm_ = (msg: string) => typeof window !== "undefined" && window.confirm(msg);
