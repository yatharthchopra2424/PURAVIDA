"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface LoginFormProps {
  redirectTo: string;
  /** Password already accepted this session; only the authenticator code is missing. */
  startAtMfa?: boolean;
}

export default function LoginForm({ redirectTo, startAtMfa = false }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"password" | "mfa">(startAtMfa ? "mfa" : "password");
  const [code, setCode] = useState("");

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Invalid email or password. Please try again."
          : authError.message
      );
      setIsLoading(false);
      return;
    }

    // Two-factor: if the account has an authenticator enrolled, the
    // password alone only reaches aal1 and the code is still required.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      setStep("mfa");
      setIsLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (listError || !factor) {
      setError("No authenticator is set up for this account. Sign in again.");
      setIsLoading(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (verifyError) {
      setError("That code didn't match. Check the app and try the current code.");
      setCode("");
      setIsLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  if (step === "mfa") {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </span>
          <div>
            <h1 className="text-white font-heading font-bold text-2xl mb-1">Two-factor code</h1>
            <p className="text-zinc-400 text-sm">Enter the 6-digit code from your authenticator app.</p>
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <form onSubmit={handleMfa} className="space-y-4">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            aria-label="6-digit authentication code"
            className="w-full bg-zinc-800 border border-zinc-700 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder-zinc-600 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {isLoading ? "Verifying…" : "Verify and continue"}
          </button>
        </form>
        <form action="/x-admin/logout" method="post" className="mt-4 text-center">
          <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-300">Use a different account</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h1 className="text-white font-heading font-bold text-2xl mb-1">
          Sign In
        </h1>
        <p className="text-zinc-400 text-sm">
          Access the PuraVida admin panel
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-zinc-300 text-sm font-medium mb-2">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-zinc-300 text-sm font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2 mt-6"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p className="text-center text-zinc-600 text-xs mt-6">
        This portal is restricted to authorized administrators only.
      </p>
    </div>
  );
}
